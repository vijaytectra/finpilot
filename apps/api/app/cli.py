"""Operational commands.

python -m app.cli seed            # demo users + all CSVs from DATA_DIR (idempotent)
python -m app.cli seed --no-users
"""

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import get_settings
from app.core.database import engine
from app.core.logging import configure_logging, get_logger, use_json_logs
from app.core.security import hash_password
from app.importers.batches import ImportOutcome
from app.importers.reference import REFERENCE_SPECS, import_reference
from app.importers.transactions import import_transactions
from app.models import User
from app.models.enums import Role

log = get_logger("app.cli")


async def seed_users() -> None:
    settings = get_settings()
    if settings.environment == "production":
        log.warning("seed_users_skipped", reason="demo users are never created in production")
        return
    demo = [
        (settings.demo_admin_email, "Demo Admin", Role.ADMIN, settings.demo_admin_password),
        (settings.demo_viewer_email, "Demo Viewer", Role.VIEWER, settings.demo_viewer_password),
    ]
    async with engine.begin() as conn:
        for email, name, role, password in demo:
            exists = await conn.scalar(select(User.id).where(User.email == email.lower()))
            if exists:
                continue
            await conn.execute(
                pg_insert(User)
                .values(
                    email=email.lower(),
                    full_name=name,
                    role=role.value,
                    password_hash=hash_password(password.get_secret_value()),
                )
                .on_conflict_do_nothing(index_elements=[User.email])
            )
            log.info("demo_user_created", email=email.lower(), role=role.value)


def _report(outcome: ImportOutcome) -> None:
    print(
        f"  {outcome.kind.value:<14} total={outcome.total_rows:>5} "
        f"inserted={outcome.inserted_rows:>5} duplicates={outcome.duplicate_rows:>5} "
        f"rejected={outcome.rejected_rows:>3}"
    )
    for issue in outcome.issues:
        print(f"      line {issue.line_number}: {issue.error_code} - {issue.message}")


async def seed_data() -> None:
    data_dir = get_settings().data_dir
    print(f"Seeding from {data_dir}")
    for spec in REFERENCE_SPECS:
        content = (data_dir / spec.filename).read_bytes()
        _report(await import_reference(engine, spec, content))
    content = (data_dir / "transactions.csv").read_bytes()
    _report(await import_transactions(engine, content, source="SEED"))


async def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    seed = sub.add_parser("seed", help="create demo users and load data/raw CSVs (idempotent)")
    seed.add_argument("--no-users", action="store_true")
    args = parser.parse_args(argv)

    settings = get_settings()
    configure_logging(settings.log_level, json=use_json_logs(settings.environment))
    try:
        if args.command == "seed":
            if not args.no_users:
                await seed_users()
            await seed_data()
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_main(sys.argv[1:])))
