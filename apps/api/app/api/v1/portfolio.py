from fastapi import APIRouter

from app.api.deps import CurrentUser, CustomerIdPath, SessionDep
from app.repositories.customers import CustomerRepository
from app.repositories.portfolio import PortfolioRepository
from app.schemas.common import error_responses
from app.schemas.portfolio import Portfolio
from app.services.customers import CustomerService
from app.services.portfolio import PortfolioService

router = APIRouter(prefix="/customers", tags=["portfolio"])

# Real response for C0026 from the seeded dataset (lists truncated to one element).
_EXAMPLE = {
    "customer_id": "C0026",
    "currency": "INR",
    "freshness": {
        "snapshot_date": "2026-09-18",
        "price_as_of": "2026-09-18",
        "oldest_price_as_of": "2026-09-18",
        "stale_prices": False,
    },
    "totals": {
        "market_value": 1953574.59,
        "cost_basis": 1964360.97,
        "unrealized_pnl": -10786.37,
        "unrealized_pnl_pct": -0.55,
        "positions": 19,
    },
    "accounts": [
        {
            "account_id": "A00034",
            "account_type": "RETIREMENT",
            "provider": "Zenith Broking",
            "status": "ACTIVE",
            "opened_at": "2026-01-27",
            "market_value": 1245566.63,
            "cost_basis": 1218651.57,
            "unrealized_pnl": 26915.06,
            "unrealized_pnl_pct": 2.21,
            "positions": 10,
        }
    ],
    "allocation": [
        {"asset_class": "EQUITY", "market_value": 1804340.02, "weight_pct": 92.36, "positions": 12}
    ],
    "positions": [
        {
            "account_id": "A00035",
            "instrument_id": "I0019",
            "symbol": "EQ019",
            "instrument_name": "FinPilot Equity 19",
            "asset_class": "EQUITY",
            "sector": "Healthcare",
            "risk_band": "MEDIUM",
            "quantity": 166.282,
            "avg_cost": 2551.4,
            "last_price": 2215.39,
            "price_as_of": "2026-09-18",
            "market_value": 368379.48,
            "cost_basis": 424251.89,
            "unrealized_pnl": -55872.41,
            "unrealized_pnl_pct": -13.17,
            "weight_pct": 18.86,
        }
    ],
}


@router.get(
    "/{customer_id}/portfolio",
    response_model=Portfolio,
    summary="Portfolio valuation: totals, per-account totals, allocation and positions",
    description=(
        "Valued from the latest holdings snapshot at the latest synthetic prices. All "
        "aggregation runs in PostgreSQL (one GROUPING SETS query for account/asset-class/"
        "grand totals). Every account is listed, including those without positions. "
        "`freshness` tells the client which snapshot and price dates the numbers reflect. "
        "Each figure is computed exactly and rounded half-up to 2 dp independently, so a sum "
        "of rounded parts can differ from the rounded total by up to 0.01 per part."
    ),
    responses={
        200: {"content": {"application/json": {"example": _EXAMPLE}}},
        **error_responses(401, 404, 422),
    },
)
async def get_portfolio(
    customer_id: CustomerIdPath, _: CurrentUser, session: SessionDep
) -> Portfolio:
    service = PortfolioService(
        PortfolioRepository(session), CustomerService(CustomerRepository(session))
    )
    return await service.for_customer(customer_id)
