document.addEventListener('DOMContentLoaded', function() {
    const cryptoValue = document.getElementById('btcValue');
    const changePercentage = document.getElementById('changePercentage');
    const arrow = changePercentage.querySelector('.arrow');
    const ctx = document.getElementById('salesChart').getContext('2d');
    const cryptoSelect = document.getElementById('cryptoSelect');
    const errorMessage = document.getElementById('errorMessage');
    const decisionMessage = document.getElementById('decisionMessage');
    const automataButton = document.getElementById('automataButton');

    let currentCrypto = 'bitcoin';
    const supportedCryptos = ['bitcoin', 'ethereum', 'ripple'];
    let chart;

    async function fetchCryptoData() {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${supportedCryptos.join(',')}&vs_currencies=usd&include_24hr_change=true`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching crypto data:', error);
            errorMessage.textContent = `Error al actualizar datos: ${error.message}. Intentando de nuevo en 1 minuto.`;
            errorMessage.style.display = 'block';
            return null;
        }
    }

    async function fetchHistoricalData(crypto) {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${crypto}/market_chart?vs_currency=usd&days=7&interval=daily`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const prices = data.prices.map(p => p[1]);
            const times = data.prices.map(p => new Date(p[0]));
            return { times, prices };
        } catch (error) {
            console.error('Error fetching historical data:', error);
            errorMessage.textContent = `Error al obtener los datos históricos: ${error.message}`;
            errorMessage.style.display = 'block';
            return null;
        }
    }

    function createOrUpdateChart(crypto, chartData) {
        if (chart) {
            chart.data.labels = chartData.times;
            chart.data.datasets[0].data = chartData.prices;
            chart.options.scales.y.title.text = `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`;
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.times,
                    datasets: [{
                        label: `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`,
                        data: chartData.prices,
                        borderColor: '#2196f3',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`
                            }
                        }
                    }
                }
            });
        }
    }

    function updateInterface(crypto, price, change) {
        const formattedPrice = `${crypto.toUpperCase()} ${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        cryptoValue.textContent = formattedPrice;
        
        const changeText = Math.abs(change).toFixed(2);
        const isPositive = change >= 0;

        arrow.textContent = isPositive ? '↑' : '↓';
        changePercentage.innerHTML = `
            <span class="arrow">${arrow.textContent}</span> 
            ${isPositive ? '+' : '-'}${changeText}%
        `;
        changePercentage.style.color = isPositive ? '#4caf50' : '#f44336';
    }

    async function changeCryptocurrency() {
        currentCrypto = cryptoSelect.value;
        const chartData = await fetchHistoricalData(currentCrypto);
        if (chartData) {
            createOrUpdateChart(currentCrypto, chartData);
        }
        const latestData = await fetchCryptoData();
        if (latestData && latestData[currentCrypto]) {
            updateInterface(currentCrypto, latestData[currentCrypto].usd, latestData[currentCrypto].usd_24h_change);
        }
    }

    function makeDecision(prices) {
        const slope = linearRegression(prices);
        let decision = 'Mantenerse';

        if (slope > 0) {
            decision = 'Comprar';
        } else if (slope < 0) {
            decision = 'Vender';
        }

        return decision;
    }

    function linearRegression(prices) {
        const n = prices.length;
        const x = Array.from({ length: n }, (_, i) => i + 1);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = prices.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, curr, i) => acc + curr * prices[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    async function runAutomata() {
        const chartData = await fetchHistoricalData(currentCrypto);
        if (chartData) {
            const decision = makeDecision(chartData.prices);
            decisionMessage.textContent = `Decisión del autómata para ${currentCrypto}: ${decision}`;
            decisionMessage.style.display = 'block';
        }
    }

    cryptoSelect.addEventListener('change', changeCryptocurrency);
    automataButton.addEventListener('click', runAutomata);

    // Inicialización
    (async () => {
        const chartData = await fetchHistoricalData(currentCrypto);
        if (chartData) {
            createOrUpdateChart(currentCrypto, chartData);
        }
        const latestData = await fetchCryptoData();
        if (latestData && latestData[currentCrypto]) {
            updateInterface(currentCrypto, latestData[currentCrypto].usd, latestData[currentCrypto].usd_24h_change);
        }
    })();
});