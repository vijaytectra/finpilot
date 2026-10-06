from decimal import Decimal

from sqlalchemy import RowMapping

from app.repositories.portfolio import PortfolioRepository
from app.schemas.portfolio import (
    AccountValuation,
    AllocationSlice,
    DataFreshness,
    Portfolio,
    Position,
    Valuation,
)
from app.services.customers import CustomerService

ZERO = Decimal(0)


def _pct(numerator: Decimal, denominator: Decimal) -> Decimal | None:
    return None if denominator == 0 else numerator * 100 / denominator


def _valuation(row: RowMapping | None) -> dict[str, object]:
    if row is None:
        return {
            "market_value": ZERO,
            "cost_basis": ZERO,
            "unrealized_pnl": ZERO,
            "unrealized_pnl_pct": None,
            "positions": 0,
        }
    return {
        "market_value": row["market_value"],
        "cost_basis": row["cost_basis"],
        "unrealized_pnl": row["unrealized_pnl"],
        "unrealized_pnl_pct": _pct(row["unrealized_pnl"], row["cost_basis"]),
        "positions": row["positions"],
    }


class PortfolioService:
    def __init__(self, portfolio: PortfolioRepository, customers: CustomerService) -> None:
        self._repo = portfolio
        self._customers = customers

    async def for_customer(self, customer_id: str) -> Portfolio:
        await self._customers.ensure_exists(customer_id)
        accounts = await self._repo.accounts(customer_id)
        snapshot = await self._repo.latest_snapshot_date()
        aggregates = await self._repo.aggregates(customer_id, snapshot) if snapshot else []
        positions = await self._repo.positions(customer_id, snapshot) if snapshot else []

        total = next((r for r in aggregates if r["level"] == "total" and r["positions"]), None)
        by_account = {r["account_id"]: r for r in aggregates if r["level"] == "account"}
        classes = [r for r in aggregates if r["level"] == "asset_class"]
        grand = total["market_value"] if total else ZERO

        return Portfolio(
            customer_id=customer_id,
            freshness=DataFreshness(
                snapshot_date=snapshot,
                price_as_of=total["price_as_of"] if total else None,
                oldest_price_as_of=total["oldest_price_as_of"] if total else None,
                stale_prices=bool(total and snapshot and total["oldest_price_as_of"] < snapshot),
            ),
            totals=Valuation.model_validate(_valuation(total)),
            # Every account is listed, including those with no positions (closed/dormant).
            accounts=[
                AccountValuation.model_validate(
                    {**dict(a), **_valuation(by_account.get(a["account_id"]))}
                )
                for a in accounts
            ],
            allocation=sorted(
                (
                    AllocationSlice(
                        asset_class=r["asset_class"],
                        market_value=r["market_value"],
                        weight_pct=_pct(r["market_value"], grand) or ZERO,
                        positions=r["positions"],
                    )
                    for r in classes
                ),
                key=lambda s: s.market_value,
                reverse=True,
            ),
            positions=[Position.model_validate(dict(p)) for p in positions],
        )
