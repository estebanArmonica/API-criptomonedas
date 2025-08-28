class CryptoDashboard {
    constructor() {
        this.currentCoin = 'bitcoin';
        this.currentData = null;
        this.useDemoMode = false;
        this.init();
    }

    async init() {
        console.log("🚀 Inicializando dashboard...");
        await this.loadGlobalMetrics();
        await this.loadOpportunities();
        this.setupEventListeners();
        await this.loadCoinData(this.currentCoin);
    }

    setupEventListeners() {
        // Selector de moneda
        const coinSelector = document.getElementById('coinSelector');
        if (coinSelector) {
            coinSelector.addEventListener('change', (e) => {
                this.currentCoin = e.target.value;
                this.loadCoinData(this.currentCoin);
            });
        }

        // Formulario de filtros
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }

        // Botón de recarga
        const reloadBtn = document.getElementById('reloadBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                this.reloadAllData();
            });
        }

        // Botones de timeframe
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const timeframe = this.getAttribute('data-timeframe');
                const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
                dashboard.loadCoinData(dashboard.currentCoin, days);
            });
        });
    }

    async reloadAllData() {
        console.log("🔄 Recargando todos los datos...");
        this.useDemoMode = false;
        
        // Mostrar indicadores de carga
        this.showLoadingState('globalMetrics', 'opportunities', 'tradingSignals', 'predictions');
        await this.loadGlobalMetrics();
        await this.loadOpportunities();
        await this.loadCoinData(this.currentCoin);
    }

    async loadGlobalMetrics() {
        try {
            console.log("📊 Cargando métricas globales...");
            const response = await fetch('/api/v1/global-metrics');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("Endpoint no encontrado, usando endpoint alternativo...");
                    await this.loadGlobalMetricsAlternative();
                    return;
                }
                throw new Error('HTTP error ' + response.status);
            }
            
            const data = await response.json();
            console.log("Métricas globales:", data);
            
            this.renderGlobalMetrics(data);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error loading global metrics:', error);
            await this.loadGlobalMetricsAlternative();
        }
    }

    async loadGlobalMetricsAlternative() {
        try {
            console.log("📊 Intentando obtener datos alternativos...");
            
            // Usar el endpoint de performance del mercado
            const response = await fetch('/api/v1/market/performance');
            
            if (!response.ok) {
                throw new Error('Alternative endpoint error ' + response.status);
            }
            
            const data = await response.json();
            const metrics = {
                total_market_cap: data.total_market_cap || 0,
                total_volume: data.total_volume || 0,
                market_cap_change_24h: data.market_cap_change_24h || 0,
                active_cryptocurrencies: data.active_cryptocurrencies || 0,
                timestamp: data.timestamp || new Date().toISOString()
            };
            
            this.renderGlobalMetrics(metrics);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error loading alternative metrics:', error);
            this.showDemoGlobalMetrics();
            this.useDemoMode = true;
        }
    }

    renderGlobalMetrics(data) {
        const globalMetrics = document.getElementById('globalMetrics');
        if (!globalMetrics) return;
        
        const metricsHtml = `
            <div class="metric-item">
                <small>Market Cap Total:</small>
                <strong>$${this.formatNumber(data.total_market_cap)}</strong>
            </div>
            <div class="metric-item">
                <small>Volumen 24h:</small>
                <strong>$${this.formatNumber(data.total_volume)}</strong>
            </div>
            <div class="metric-item">
                <small>Cambio 24h:</small>
                <strong class="${data.market_cap_change_24h >= 0 ? 'text-success' : 'text-danger'}">
                    ${data.market_cap_change_24h?.toFixed(2) || '0.00'}%
                </strong>
            </div>
            <div class="metric-item">
                <small>Criptomonedas:</small>
                <strong>${this.formatNumber(data.active_cryptocurrencies)}</strong>
            </div>
            ${this.useDemoMode ? '<div class="alert alert-warning mt-2"><small>⚠️ Usando datos en tiempo real</small></div>' : ''}
        `;
        
        globalMetrics.innerHTML = metricsHtml;
    }

    showDemoGlobalMetrics() {
        const globalMetrics = document.getElementById('globalMetrics');
        if (!globalMetrics) return;
        
        const demoHtml = `
            <div class="alert alert-warning">
                <small>⚠️ Modo offline: Datos simulados</small>
                <button onclick="dashboard.reloadAllData()" class="btn btn-sm btn-outline-warning ms-2">
                    Reintentar
                </button>
            </div>
            <div class="metric-item">
                <small>Market Cap Total:</small>
                <strong>$1.5T</strong>
            </div>
            <div class="metric-item">
                <small>Volumen 24h:</small>
                <strong>$50B</strong>
            </div>
            <div class="metric-item">
                <small>Cambio 24h:</small>
                <strong class="text-success">+2.5%</strong>
            </div>
            <div class="metric-item">
                <small>Criptomonedas:</small>
                <strong>10,000</strong>
            </div>
        `;
        globalMetrics.innerHTML = demoHtml;
    }

    async loadCoinData(coinId, days = 30) {
        try {
            console.log(`📈 Cargando datos de ${coinId}...`);
            this.showLoadingState('tradingSignals', 'predictions');

            const response = await fetch(`/api/v1/analysis/${coinId}?days=${days}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("Endpoint de análisis no encontrado, intentando datos básicos...");
                    await this.loadBasicCoinData(coinId);
                    return;
                }
                throw new Error('HTTP error ' + response.status);
            }
            
            const data = await response.json();
            console.log("Datos de análisis:", data);
            this.currentData = data;

            this.renderPriceChart(data);
            this.renderTradingSignals(data);
            this.renderPredictions(data);
            this.renderQuickStats(data);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error loading coin data:', error);
            await this.loadBasicCoinData(coinId);
        }
    }

    async loadBasicCoinData(coinId) {
        try {
            console.log(`📈 Obteniendo datos básicos para ${coinId}...`);
            
            // Intentar obtener datos básicos del endpoint de precio
            const response = await fetch(`/api/v1/trading/${coinId}/price`);
            
            if (!response.ok) {
                throw new Error('Basic data endpoint error');
            }

            const priceData = await response.json();
            
            const basicData = {
                coin_id: coinId,
                current_price: priceData.price_usd,
                price_change_24h: priceData.price_change_24h || 0,
                market_cap: priceData.market_cap || 0,
                volume_24h: priceData.volume_24h || 0,
                signals: [{
                    type: "HOLD",
                    price: priceData.price_usd,
                    reason: "Datos básicos - Análisis limitado",
                    confidence: "medium",
                    timestamp: new Date().toISOString()
                }],
                predictions: [],
                historical_data: this.generateDemoHistoricalData(coinId, priceData.price_usd),
                best_action: "HOLD",
                action_reason: "Datos básicos disponibles"
            };

            this.renderPriceChart(basicData);
            this.renderTradingSignals(basicData);
            this.renderPredictions(basicData);
            this.renderQuickStats(basicData);
            this.useDemoMode = false;

        } catch (error) {
            console.error('Error loading basic data:', error);
            this.showDemoCoinData(coinId);
            this.useDemoMode = true;
        }
    }

    showLoadingState(...elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = `
                    <div class="text-center">
                        <div class="spinner-border spinner-border-sm"></div>
                        <p class="mt-2">Cargando datos en tiempo real...</p>
                    </div>
                `;
            }
        });
    }

    showDemoCoinData(coinId) {
        const demoData = {
            coin_id: coinId,
            current_price: coinId === 'bitcoin' ? 45000 : 
                         coinId === 'ethereum' ? 3000 : 100,
            signals: [{
                type: "HOLD",
                price: coinId === 'bitcoin' ? 45000 : 
                      coinId === 'ethereum' ? 3000 : 100,
                reason: "Modo offline - Datos simulados",
                confidence: "medium",
                timestamp: new Date().toISOString()
            }],
            predictions: [],
            historical_data: this.generateDemoHistoricalData(coinId)
        };

        this.renderPriceChart(demoData);
        this.renderTradingSignals(demoData);
        this.renderPredictions(demoData);
        this.renderQuickStats(demoData);

        // Mostrar advertencia
        const tradingSignals = document.getElementById('tradingSignals');
        if (tradingSignals) {
            tradingSignals.innerHTML += `
                <div class="alert alert-warning mt-3">
                    <small>⚠️ Modo offline: Datos simulados</small>
                    <button onclick="dashboard.loadCoinData('${coinId}')" class="btn btn-sm btn-outline-warning ms-2">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    generateDemoHistoricalData(coinId, basePrice = null) {
        const price = basePrice || (coinId === 'bitcoin' ? 45000 : 
                         coinId === 'ethereum' ? 3000 : 100);
        
        const data = [];
        const now = Date.now();
        
        for (let i = 30; i >= 0; i--) {
            const timestamp = new Date(now - i * 86400000).toISOString();
            const randomPrice = price * (1 + (Math.random() - 0.5) * 0.1);
            data.push({ timestamp, price: parseFloat(randomPrice.toFixed(2)) });
        }
        
        return data;
    }

    renderQuickStats(data) {
        const quickStats = document.getElementById('quickStats');
        if (!quickStats || !data) return;

        const statsHtml = `
            <div class="stat-item">
                <small>Precio Actual</small>
                <h4 class="mb-0">$${data.current_price?.toFixed(2) || '0.00'}</h4>
            </div>
            <div class="stat-item">
                <small>Cambio 24h</small>
                <h4 class="mb-0 ${data.price_change_24h >= 0 ? 'text-success' : 'text-danger'}">
                    ${data.price_change_24h?.toFixed(2) || '0.00'}%
                </h4>
            </div>
            <div class="stat-item">
                <small>Market Cap</small>
                <h4 class="mb-0">$${this.formatNumber(data.market_cap)}</h4>
            </div>
            <div class="stat-item">
                <small>Volumen 24h</small>
                <h4 class="mb-0">$${this.formatNumber(data.volume_24h)}</h4>
            </div>
        `;

        quickStats.innerHTML = statsHtml;
    }

    renderPriceChart(data) {
        const chartDiv = document.getElementById('priceChart');
        if (!chartDiv) return;
        
        if (!data || !data.historical_data || !Array.isArray(data.historical_data)) {
            chartDiv.innerHTML = `
                <div class="alert alert-info">
                    <p>📊 Gráfico no disponible</p>
                    <small>No hay datos históricos</small>
                </div>
            `;
            return;
        }

        try {
            const timestamps = data.historical_data.map(item => 
                item.timestamp ? new Date(item.timestamp) : new Date()
            );
            const prices = data.historical_data.map(item => item.price || 0);

            const chartData = [{
                x: timestamps,
                y: prices,
                type: 'scatter',
                mode: 'lines',
                name: 'Precio USD',
                line: { color: '#667eea', width: 3 },
                hovertemplate: '<b>%{x}</b><br>$%{y:.2f}<extra></extra>',
                fill: 'tozeroy',
                fillcolor: 'rgba(102, 126, 234, 0.1)'
            }];

            const layout = {
                title: {
                    text: `Precio de ${data.coin_id ? data.coin_id.toUpperCase() : 'Criptomoneda'}`,
                    font: { size: 18, family: 'Arial', color: '#2c3e50' }
                },
                xaxis: { 
                    title: 'Fecha',
                    gridcolor: '#f0f0f0',
                    showgrid: true,
                    tickformat: '%b %d'
                },
                yaxis: { 
                    title: 'Precio (USD)',
                    gridcolor: '#f0f0f0',
                    showgrid: true,
                    tickprefix: '$',
                    tickformat: '$.2f'
                },
                showlegend: false,
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(0,0,0,0)',
                hovermode: 'x unified',
                margin: { l: 60, r: 30, t: 60, b: 50 },
                font: { family: 'Arial', size: 12 }
            };

            const config = {
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToAdd: ['hoverClosestGl2d'],
                modeBarButtonsToRemove: ['autoScale2d', 'toggleSpikelines'],
                scrollZoom: true
            };

            Plotly.newPlot('priceChart', chartData, layout, config);
        } catch (error) {
            console.error('Error rendering chart:', error);
            chartDiv.innerHTML = `
                <div class="alert alert-warning">
                    <p>⚠️ Error mostrando gráfico</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    renderTradingSignals(data) {
        const signalsDiv = document.getElementById('tradingSignals');
        if (!signalsDiv) return;
        
        if (!data || !data.signals || !Array.isArray(data.signals)) {
            signalsDiv.innerHTML = `
                <div class="alert alert-info">
                    <h6>📊 Señales de Trading</h6>
                    <p>No hay señales disponibles</p>
                    <small>Esperando datos de análisis...</small>
                </div>
            `;
            return;
        }

        let signalsHtml = '';
        data.signals.forEach(signal => {
            const alertClass = signal.type === 'BUY' ? 'alert-success' : 
                             signal.type === 'SELL' ? 'alert-danger' : 'alert-warning';
            
            signalsHtml += `
                <div class="alert ${alertClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${signal.type || 'HOLD'} 
                                <span class="badge bg-${signal.confidence === 'high' ? 'success' : signal.confidence === 'medium' ? 'warning' : 'secondary'}">
                                ${signal.confidence ? signal.confidence.toUpperCase() : 'MEDIUM'}
                            </span>
                            </h6>
                            <p class="mb-1">${signal.reason || 'Análisis técnico'}</p>
                            <small class="text-muted">Precio: $${signal.price ? signal.price.toFixed(2) : 'N/A'}</small>
                            <br>
                            <small class="text-muted">${new Date(signal.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                </div>
            `;
        });

        signalsDiv.innerHTML = signalsHtml;
    }

    renderPredictions(data) {
        const predictionsDiv = document.getElementById('predictions');
        if (!predictionsDiv) return;
        
        if (!data || !data.predictions || !Array.isArray(data.predictions) || data.predictions.length === 0) {
            predictionsDiv.innerHTML = `
                <div class="alert alert-info">
                    <h6>🔮 Predicciones</h6>
                    <p>No hay predicciones disponibles</p>
                    <small>El análisis predictivo está en desarrollo</small>
                </div>
            `;
            return;
        }

        let predictionsHtml = '';
        data.predictions.forEach(prediction => {
            const trendIcon = prediction.predicted_trend === 'bullish' ? '📈' : '📉';
            const trendClass = prediction.predicted_trend === 'bullish' ? 'text-success' : 'text-danger';
            const confidenceWidth = prediction.confidence ? (prediction.confidence * 100) : 0;
            
            predictionsHtml += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">${trendIcon} Predicción ${prediction.timeframe_hours || 24}h</h6>
                        
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Actual:</small>
                                <p class="mb-1">$${prediction.current_price ? prediction.current_price.toFixed(2) : '0.00'}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Predicción:</small>
                                <p class="mb-1 ${trendClass}">$${prediction.predicted_price ? prediction.predicted_price.toFixed(2) : '0.00'}</p>
                            </div>
                        </div>
                        
                        <div class="mt-2">
                            <small class="text-muted">Cambio: </small>
                            <span class="${trendClass} fw-bold">
                                ${prediction.change_percentage ? prediction.change_percentage.toFixed(2) : '0.00'}%
                            </span>
                        </div>
                        
                        <div class="mt-2">
                            <small class="text-muted">Confianza: </small>
                            <div class="progress mt-1" style="height: 8px;">
                                <div class="progress-bar" 
                                     style="width: ${confidenceWidth}%"
                                     role="progressbar">
                                </div>
                            </div>
                            <small>${confidenceWidth.toFixed(0)}%</small>
                        </div>
                    </div>
                </div>
            `;
        });

        predictionsDiv.innerHTML = predictionsHtml;
    }

    async loadOpportunities() {
        try {
            console.log("💎 Buscando oportunidades...");
            
            const response = await fetch('/api/v1/top-opportunities?limit=5');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("Endpoint de oportunidades no encontrado, usando alternativo...");
                    await this.loadAlternativeOpportunities();
                    return;
                }
                throw new Error('HTTP error ' + response.status);
            }
            
            const opportunities = await response.json();
            
            if (!opportunities || !Array.isArray(opportunities)) {
                throw new Error('Formato de datos inválido');
            }
            
            this.renderOpportunities(opportunities);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error loading opportunities:', error);
            await this.loadAlternativeOpportunities();
        }
    }

    async loadAlternativeOpportunities() {
        try {
            console.log("💎 Buscando oportunidades alternativas...");
            
            // Intentar con el endpoint de top gainers
            const response = await fetch('/api/v1/coins/top-gainers?limit=5');
            
            if (!response.ok) {
                throw new Error('Alternative endpoint error');
            }
            
            const data = await response.json();
            const opportunities = data.gainers.map(coin => ({
                coin: coin,
                signal: {
                    type: 'BUY',
                    confidence: 'medium',
                    reason: `Ganadora del día: +${coin.price_change_percentage_24h?.toFixed(1)}%`,
                    price: coin.current_price,
                    timestamp: new Date().toISOString()
                }
            }));
            
            this.renderOpportunities(opportunities);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error loading alternative opportunities:', error);
            this.showDemoOpportunities();
            this.useDemoMode = true;
        }
    }

    renderOpportunities(opportunities) {
        const opportunitiesDiv = document.getElementById('opportunities');
        if (!opportunitiesDiv) return;
        
        let opportunitiesHtml = `
            <div class="row">
                <div class="col-12">
                    <div class="alert alert-info">
                        <small>💎 ${this.useDemoMode ? 'Modo offline: ' : ''}Oportunidades detectadas</small>
                    </div>
                </div>
            </div>
            <div class="row">
        `;
        
        opportunities.forEach(opp => {
            const coin = opp.coin || {};
            const signal = opp.signal || {};
            
            opportunitiesHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card opportunity-card" onclick="dashboard.loadCoinData('${coin.id || 'bitcoin'}')">
                        <div class="card-body">
                            <h6 class="card-title">${coin.name || 'Unknown'} 
                                <small class="text-muted">(${coin.symbol ? coin.symbol.toUpperCase() : 'N/A'})</small>
                            </h6>
                            <p class="card-text mb-1">
                                <span class="fw-bold">$${coin.current_price ? coin.current_price.toFixed(2) : '0.00'}</span>
                                <span class="${coin.price_change_percentage_24h >= 0 ? 'text-success' : 'text-danger'} small ms-2">
                                    ${coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(1) + '%' : ''}
                                </span>
                            </p>
                            <p class="card-text">
                                <span class="badge bg-${signal.type === 'BUY' ? 'success' : signal.type === 'SELL' ? 'danger' : 'warning'}">
                                    ${signal.type || 'HOLD'}
                                </span>
                                <small class="text-muted ms-1">(${signal.confidence || 'MEDIUM'})</small>
                            </p>
                            <p class="card-text small text-muted">
                                ${signal.reason ? signal.reason.substring(0, 50) + '...' : 'Analizando oportunidad...'}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        opportunitiesHtml += '</div>';
        
        if (this.useDemoMode) {
            opportunitiesHtml += `
                <div class="alert alert-warning mt-2">
                    <small>⚠️ Datos simulados - </small>
                    <button onclick="dashboard.loadOpportunities()" class="btn btn-sm btn-outline-warning">
                        Actualizar
                    </button>
                </div>
            `;
        }
        
        opportunitiesDiv.innerHTML = opportunitiesHtml;
    }

    showDemoOpportunities() {
        const demoOpportunities = [
            {
                coin: {id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 45000, price_change_percentage_24h: 2.5},
                signal: {type: 'BUY', confidence: 'high', reason: 'Precio en soporte técnico fuerte, RSI en sobreventa'}
            },
            {
                coin: {id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3000, price_change_percentage_24h: -1.2},
                signal: {type: 'HOLD', confidence: 'medium', reason: 'Mercado lateral, esperar señal más clara'}
            },
            {
                coin: {id: 'binancecoin', name: 'BNB', symbol: 'bnb', current_price: 350, price_change_percentage_24h: 0.8},
                signal: {type: 'BUY', confidence: 'medium', reason: 'Tendencia alcista en marco de 1 semana'}
            }
        ];
        
        this.renderOpportunities(demoOpportunities);
    }

    async applyFilters() {
        const formData = new FormData(document.getElementById('filterForm'));
        const filters = {
            time_frame: formData.get('time_frame'),
            min_price: formData.get('min_price') ? parseFloat(formData.get('min_price')) : null,
            max_price: formData.get('max_price') ? parseFloat(formData.get('max_price')) : null,
            min_market_cap: formData.get('min_market_cap') ? parseFloat(formData.get('min_market_cap')) : null,
            trend: formData.get('trend'),
            limit: 20
        };

        try {
            const response = await fetch('/api/v1/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) {
                throw new Error('HTTP error ' + response.status);
            }
            
            const filteredCoins = await response.json();
            this.displayFilteredResults(filteredCoins);
            this.useDemoMode = false;
            
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showFilterError();
            this.useDemoMode = true;
        }
    }

    showFilterError() {
        alert('Error aplicando filtros. Mostrando monedas populares...');
        
        // Mostrar monedas populares como fallback
        const popularCoins = [
            {id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', current_price: 45000},
            {id: 'ethereum', name: 'Ethereum', symbol: 'eth', current_price: 3000},
            {id: 'binancecoin', name: 'BNB', symbol: 'bnb', current_price: 350},
            {id: 'ripple', name: 'XRP', symbol: 'xrp', current_price: 0.65},
            {id: 'cardano', name: 'Cardano', symbol: 'ada', current_price: 0.45}
        ];
        
        this.displayFilteredResults(popularCoins);
    }

    displayFilteredResults(coins) {
        if (!coins || !Array.isArray(coins)) {
            this.showFilterError();
            return;
        }

        const selector = document.getElementById('coinSelector');
        if (!selector) return;

        const originalOptions = selector.innerHTML;
        selector.innerHTML = '';
        
        coins.forEach(coin => {
            const option = document.createElement('option');
            option.value = coin.id;
            option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
            selector.appendChild(option);
        });
        
        if (coins.length > 0) {
            this.currentCoin = coins[0].id;
            this.loadCoinData(this.currentCoin);
        } else {
            selector.innerHTML = originalOptions;
            alert('No se encontraron resultados con los filtros aplicados.');
        }
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0.00';
        const number = parseFloat(num);
        if (isNaN(number)) return '0.00';
        
        if (number >= 1e9) return (number / 1e9).toFixed(2) + 'B';
        if (number >= 1e6) return (number / 1e6).toFixed(2) + 'M';
        if (number >= 1e3) return (number / 1e3).toFixed(2) + 'K';
        return number.toFixed(2);
    }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new CryptoDashboard();
});