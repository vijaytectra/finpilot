"""Domain vocabularies. Stored as VARCHAR + CHECK (not native PG ENUM) so adding a value
is a one-line constraint migration instead of an ALTER TYPE dance."""

from enum import StrEnum


class Role(StrEnum):
    VIEWER = "VIEWER"
    ADMIN = "ADMIN"


class KycStatus(StrEnum):
    VERIFIED = "VERIFIED"
    PENDING = "PENDING"
    REVIEW = "REVIEW"


class Segment(StrEnum):
    MASS = "Mass"
    AFFLUENT = "Affluent"
    HNI = "HNI"


class AccountType(StrEnum):
    BROKERAGE = "BROKERAGE"
    MUTUAL_FUND = "MUTUAL_FUND"
    RETIREMENT = "RETIREMENT"


class AccountStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DORMANT = "DORMANT"
    CLOSED = "CLOSED"


class AssetClass(StrEnum):
    EQUITY = "EQUITY"
    ETF = "ETF"
    MUTUAL_FUND = "MUTUAL_FUND"
    BOND = "BOND"
    REIT = "REIT"
    GSEC = "GSEC"


class Exchange(StrEnum):
    NSE = "NSE"
    BSE = "BSE"
    OTC = "OTC"


class Band(StrEnum):
    """Shared LOW/MEDIUM/HIGH scale (instrument risk band, goal priority, liquidity need)."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RiskLevel(StrEnum):
    CONSERVATIVE = "Conservative"
    MODERATE = "Moderate"
    GROWTH = "Growth"
    AGGRESSIVE = "Aggressive"


class TransactionType(StrEnum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    FEE = "FEE"


class TransactionStatus(StrEnum):
    SETTLED = "SETTLED"
    PENDING = "PENDING"
    REVERSED = "REVERSED"


class GoalType(StrEnum):
    RETIREMENT = "RETIREMENT"
    EDUCATION = "EDUCATION"
    HOME_PURCHASE = "HOME_PURCHASE"
    EMERGENCY_FUND = "EMERGENCY_FUND"
    WEALTH_CREATION = "WEALTH_CREATION"
    TRAVEL = "TRAVEL"


class ImportKind(StrEnum):
    CUSTOMERS = "CUSTOMERS"
    ACCOUNTS = "ACCOUNTS"
    INSTRUMENTS = "INSTRUMENTS"
    RISK_PROFILES = "RISK_PROFILES"
    GOALS = "GOALS"
    HOLDINGS = "HOLDINGS"
    TRANSACTIONS = "TRANSACTIONS"


class ImportStatus(StrEnum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


def values(enum: type[StrEnum]) -> tuple[str, ...]:
    return tuple(member.value for member in enum)
