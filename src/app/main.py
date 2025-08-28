from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import os
import asyncio

# Importar routers
from app.apis.status import router as status_router
from app.apis.api_coingecko import router as coingecko_router
from app.apis.dashboard import router as dashboard_router
from app.services.trading_service import trading_service
from app.models.schemas import FilterRequest

app = FastAPI(
    title="CoinGecko API Dashboard",
    description="Dashboard avanzado de análisis de criptomonedas con trading signals",
    version="2.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Montar archivos estáticos
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=static_dir, html=True), name="static")

# Configurar templates
templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "templates")
templates = Jinja2Templates(directory=templates_dir)

# Configurar métricas
try:
    from app.config.metrics import setup_metrics
    setup_metrics(app)
    print("✅ Metrics module initialized")
except ImportError:
    print("⚠️  Metrics module not available")

# Incluir routers
app.include_router(
    status_router,
    prefix="/api/v1",
    tags=["Status"]
)

app.include_router(
    coingecko_router,
    prefix="/api/v1",
    tags=["Cryptocurrencies"]
)

app.include_router(
    dashboard_router,
    prefix="/api/v1",
    tags=["Dashboard"]
)

# 🔥🔥🔥 ENDPOINTS DE TRADING MEJORADOS
price_alerts: Dict[str, List[Dict]] = {}
active_monitoring: Dict[str, bool] = {}

@app.get("/api/v1/trading/test", tags=["Trading"])
async def trading_test():
    """Endpoint de prueba para trading"""
    return {
        "message": "✅ Trading endpoint is working!", 
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/v1/trading/coins/available", tags=["Trading"])
async def get_available_coins(limit: int = Query(100, ge=1, le=500)):
    """Obtiene todas las criptomonedas disponibles con paginación"""
    try:
        coins = await trading_service.get_available_coins()
        return {
            "total_coins": len(coins),
            "coins": coins[:limit],
            "limit": limit,
            "page": 1,
            "has_more": len(coins) > limit,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        # Fallback con monedas populares
        popular_coins = [
            {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "market_cap_rank": 1},
            {"id": "ethereum", "symbol": "eth", "name": "Ethereum", "market_cap_rank": 2},
            {"id": "tether", "symbol": "usdt", "name": "Tether", "market_cap_rank": 3},
            {"id": "binancecoin", "symbol": "bnb", "name": "BNB", "market_cap_rank": 4},
            {"id": "solana", "symbol": "sol", "name": "Solana", "market_cap_rank": 5},
            {"id": "ripple", "symbol": "xrp", "name": "XRP", "market_cap_rank": 6},
            {"id": "usd-coin", "symbol": "usdc", "name": "USD Coin", "market_cap_rank": 7},
            {"id": "cardano", "symbol": "ada", "name": "Cardano", "market_cap_rank": 8},
            {"id": "dogecoin", "symbol": "doge", "name": "Dogecoin", "market_cap_rank": 9},
            {"id": "avalanche-2", "symbol": "avax", "name": "Avalanche", "market_cap_rank": 10}
        ]
        return {
            "total_coins": len(popular_coins),
            "coins": popular_coins[:limit],
            "limit": limit,
            "page": 1,
            "has_more": False,
            "timestamp": datetime.now().isoformat(),
            "note": "Using popular coins list (fallback mode)"
        }

@app.get("/api/v1/trading/{coin_id}/price", tags=["Trading"])
async def get_current_price(coin_id: str):
    """Obtiene el precio actual de una criptomoneda con información extendida"""
    try:
        price = await trading_service.get_current_price(coin_id)
        if price is None:
            raise HTTPException(status_code=404, detail="Precio no disponible")
        
        # Obtener información adicional del mercado
        market_data = trading_service.client.get_coins_markets(
            vs_currency='usd',
            ids=coin_id,
            per_page=1,
            page=1
        )
        
        market_info = market_data[0] if market_data else {}
        
        return {
            "coin_id": coin_id,
            "name": market_info.get('name', coin_id),
            "symbol": market_info.get('symbol', '').upper(),
            "price_usd": price,
            "price_change_24h": market_info.get('price_change_percentage_24h', 0),
            "market_cap": market_info.get('market_cap', 0),
            "market_cap_rank": market_info.get('market_cap_rank', 0),
            "volume_24h": market_info.get('total_volume', 0),
            "high_24h": market_info.get('high_24h', 0),
            "low_24h": market_info.get('low_24h', 0),
            "timestamp": datetime.now().isoformat(),
            "last_updated": market_info.get('last_updated', datetime.now().isoformat())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo precio: {str(e)}")

@app.get("/api/v1/trading/{coin_id}/signals", tags=["Trading"])  
async def get_trading_signals(
    coin_id: str, 
    time_frame: str = Query("24h", enum=["1h", "24h", "7d", "30d"])
):
    """Señales de trading para una criptomoneda con análisis real"""
    try:
        # Obtener datos históricos para análisis
        days = 7 if time_frame == "1h" else 30 if time_frame == "24h" else 90
        historical_data = await trading_service.get_historical_data(coin_id, days)
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="Datos históricos no disponibles")
        
        # Calcular métricas
        metrics = trading_service.calculate_metrics(historical_data, time_frame)
        if not metrics:
            raise HTTPException(status_code=404, detail="No se pudieron calcular métricas")
        
        # Generar señales
        signals = trading_service.generate_trading_signals(metrics, time_frame)
        
        # Obtener precio actual
        price_data = await get_current_price(coin_id)
        
        return {
            "signals": signals,
            "metrics": metrics,
            "current_price": price_data["price_usd"],
            "coin_id": coin_id,
            "time_frame": time_frame,
            "timestamp": datetime.now().isoformat(),
            "data_points": len(historical_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando señales: {str(e)}")

@app.get("/api/v1/trading/{coin_id}/metrics", tags=["Trading"])
async def get_trading_metrics(
    coin_id: str, 
    days: int = Query(7, ge=1, le=365),
    time_frame: str = Query("24h", enum=["1h", "24h", "7d"])
):
    """Métricas de trading detalladas"""
    try:
        historical_data = await trading_service.get_historical_data(coin_id, days)
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="Datos históricos no disponibles")
        
        metrics = trading_service.calculate_metrics(historical_data, time_frame)
        
        if not metrics:
            raise HTTPException(status_code=404, detail="No se pudieron calcular métricas")
        
        # Obtener información de precio actual
        current_price = await trading_service.get_current_price(coin_id)
        
        return {
            "coin_id": coin_id,
            "time_frame": time_frame,
            "days_analyzed": days,
            "current_price": current_price,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat(),
            "data_points": len(historical_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo métricas: {str(e)}")

@app.get("/api/v1/trading/{coin_id}/calculate", tags=["Trading"])
async def calculate_crypto_value(
    coin_id: str,
    amount: float = Query(..., description="Cantidad a calcular", ge=0.00000001),
    vs_currency: str = Query("usd", description="Moneda para la conversión")
):
    """Calcula el valor en USD u otra moneda"""
    try:
        price_data = await trading_service.get_current_price(coin_id)
        if price_data is None:
            raise HTTPException(status_code=404, detail="Precio no disponible")
        
        # Si se solicita otra moneda, obtener la conversión
        if vs_currency != "usd":
            try:
                conversion_data = trading_service.client.get_price(
                    ids=coin_id, 
                    vs_currencies=vs_currency
                )
                price = conversion_data.get(coin_id, {}).get(vs_currency, price_data)
            except:
                price = price_data
        else:
            price = price_data
        
        return {
            "coin_id": coin_id,
            "amount": amount,
            "price_per_coin": price,
            "total_value": amount * price,
            "currency": vs_currency.upper(),
            "timestamp": datetime.now().isoformat(),
            "exchange_rate": price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando valor: {str(e)}")

# 🔥 NUEVOS ENDPOINTS PARA EL DASHBOARD MEJORADO

@app.get("/api/v1/market/performance", tags=["Dashboard"])
async def get_market_performance():
    """Obtiene el rendimiento general del mercado"""
    try:
        global_data = trading_service.client.get_global_data()
        
        # Calcular métricas adicionales
        total_market_cap = global_data.get('total_market_cap', {}).get('usd', 0)
        total_volume = global_data.get('total_volume', {}).get('usd', 0)
        
        return {
            "total_market_cap": total_market_cap,
            "total_volume": total_volume,
            "volume_market_cap_ratio": (total_volume / total_market_cap * 100) if total_market_cap > 0 else 0,
            "market_cap_change_24h": global_data.get('market_cap_change_percentage_24h_usd', 0),
            "active_cryptocurrencies": global_data.get('active_cryptocurrencies', 0),
            "upcoming_icos": global_data.get('upcoming_icos', 0),
            "ongoing_icos": global_data.get('ongoing_icos', 0),
            "ended_icos": global_data.get('ended_icos', 0),
            "markets": global_data.get('markets', 0),
            "bitcoin_dominance": global_data.get('market_cap_percentage', {}).get('btc', 0),
            "ethereum_dominance": global_data.get('market_cap_percentage', {}).get('eth', 0),
            "timestamp": datetime.now().isoformat(),
            "last_updated": global_data.get('updated_at', datetime.now().timestamp())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo rendimiento del mercado: {str(e)}")

@app.get("/api/v1/coins/top-gainers", tags=["Dashboard"])
async def get_top_gainers(limit: int = Query(10, ge=1, le=50)):
    """Obtiene las criptomonedas con mayor ganancia"""
    try:
        market_data = trading_service.client.get_coins_markets(
            vs_currency='usd',
            order='price_change_percentage_24h_desc',
            per_page=limit,
            page=1,
            price_change_percentage='24h'
        )
        
        return {
            "gainers": market_data,
            "limit": limit,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo top gainers: {str(e)}")

@app.get("/api/v1/coins/top-losers", tags=["Dashboard"])
async def get_top_losers(limit: int = Query(10, ge=1, le=50)):
    """Obtiene las criptomonedas con mayor pérdida"""
    try:
        market_data = trading_service.client.get_coins_markets(
            vs_currency='usd',
            order='price_change_percentage_24h_asc',
            per_page=limit,
            page=1,
            price_change_percentage='24h'
        )
        
        return {
            "losers": market_data,
            "limit": limit,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo top losers: {str(e)}")

@app.get("/api/v1/coins/trending", tags=["Dashboard"])
async def get_trending_coins(limit: int = Query(10, ge=1, le=20)):
    """Obtiene las criptomonedas trending"""
    try:
        # Usar el endpoint de búsqueda para obtener trending
        trending_data = trading_service.client.get_search_trending()
        
        coins = []
        for item in trending_data.get('coins', [])[:limit]:
            coin_info = item.get('item', {})
            coins.append({
                "id": coin_info.get('id'),
                "name": coin_info.get('name'),
                "symbol": coin_info.get('symbol'),
                "market_cap_rank": coin_info.get('market_cap_rank'),
                "thumb": coin_info.get('thumb'),
                "price_btc": coin_info.get('price_btc')
            })
        
        return {
            "trending": coins,
            "limit": limit,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo trending coins: {str(e)}")

# 🔥 NUEVO ENDPOINT PARA SIMULACIÓN DE TRADING
@app.get("/simulacion", response_class=HTMLResponse)
async def trading_simulation(request: Request):
    """Página de simulación de trading"""
    return templates.TemplateResponse("simulacion.html", {
        "request": request,
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    })

# Endpoints de utilidad y debug
@app.get("/api/debug/routes", include_in_schema=False)
async def debug_routes():
    """Muestra todas las rutas disponibles"""
    routes = []
    for route in app.routes:
        if hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "methods": getattr(route, "methods", []),
                "name": getattr(route, "name", "Unknown"),
                "tags": getattr(route, "tags", [])
            })
    return {"routes": sorted(routes, key=lambda x: x["path"])}

@app.get("/api/health", tags=["Status"])
async def health_check():
    """Health check del servicio"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "services": {
            "trading": "operational",
            "api": "operational",
            "database": "n/a"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Evento de inicialización"""
    try:
        await trading_service.initialize()
        print("✅ Trading service initialized successfully")
        print("✅ Dashboard endpoints registered")
        print("✅ API version 2.0.0 is ready")
        print("✅ Simulación disponible en: /simulacion")
    except Exception as e:
        print(f"⚠️  Error initializing trading service: {e}")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Página principal del dashboard"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Dashboard principal"""
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.get("/api", tags=["Info"])
async def api_info():
    """Información de la API"""
    return {
        "message": "CoinGecko API Dashboard", 
        "version": "2.0.0",
        "endpoints": {
            "docs": "/api/docs",
            "redoc": "/api/redoc",
            "health": "/api/health",
            "status": "/api/v1/status",
            "dashboard": "/dashboard",
            "simulacion": "/simulacion",
            "trading": "/api/v1/trading/test",
            "market_data": "/api/v1/market/performance",
            "coins": "/api/v1/trading/coins/available",
            "analysis": "/api/v1/dashboard/analysis/{coin_id}",
            "global_metrics": "/api/v1/dashboard/global-metrics",
            "top_opportunities": "/api/v1/dashboard/top-opportunities",
            "top_gainers": "/api/v1/coins/top-gainers",
            "top_losers": "/api/v1/coins/top-losers",
            "trending": "/api/v1/coins/trending"
        },
        "timestamp": datetime.now().isoformat()
    }

# Manejo de errores global
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat(),
            "path": request.url.path
        }
    )