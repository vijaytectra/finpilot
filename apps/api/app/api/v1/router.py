from fastapi import APIRouter

from app.api.v1 import auth, customers, goals, health, portfolio, transactions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(customers.router)
api_router.include_router(portfolio.router)
api_router.include_router(transactions.router)
api_router.include_router(goals.router)
