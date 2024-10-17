document.addEventListener('DOMContentLoaded', function() {
    const cryptoValue = document.getElementById('btcValue');
    const changePercentage = document.getElementById('changePercentage');
    const arrow = changePercentage.querySelector('.arrow');
    const ctx = document.getElementById('salesChart').getContext('2d');
    const cryptoSelect = document.getElementById('cryptoSelect');
    const errorMessage = document.getElementById('errorMessage'); // Asegúrate de añadir este elemento en tu HTML

    let currentCrypto = 'bitcoin';
    const supportedCryptos = ['bitcoin', 'ethereum', 'ripple', 'cardano']; // Añade aquí todas las criptomonedas que quieras soportar

    let chart;

    // Función para crear o actualizar el gráfico
    function createOrUpdateChart(crypto) {
        let storedData = JSON.parse(localStorage.getItem(`${crypto}ChartData`)) || { labels: [], prices: [] };

        let chartData = {
            labels: storedData.labels,
            datasets: [{
                label: `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`,
                data: storedData.prices,
                borderColor: '#2196f3',
                tension: 0.1,
                fill: false
            }]
        };

        if (chart) {
            chart.data = chartData;
            chart.options.scales.y.title.text = `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`;
            chart.update();
        } else {
            chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm'
                                }
                            },
                            ticks: {
                                callback: function(value, index, ticks) {
                                    const labelDate = new Date(value);
                                    return labelDate.getMinutes() % 5 === 0 ? labelDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            beginAtZero: false,
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

    // Función para actualizar los datos de todas las criptomonedas
    async function updateAllCryptoData() {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${supportedCryptos.join(',')}&vs_currencies=usd&include_24hr_change=true`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            supportedCryptos.forEach(crypto => {
                const price = data[crypto].usd;
                const change = data[crypto].usd_24h_change;
                const now = new Date();

                let storedData = JSON.parse(localStorage.getItem(`${crypto}ChartData`)) || { labels: [], prices: [] };
                
                storedData.labels.push(now);
                storedData.prices.push(price);

                if (storedData.labels.length > 240) {
                    storedData.labels.shift();
                    storedData.prices.shift();
                }

                localStorage.setItem(`${crypto}ChartData`, JSON.stringify(storedData));

                if (crypto === currentCrypto) {
                    createOrUpdateChart(crypto);
                    updateInterface(crypto, price, change);
                }
            });

            // Limpiar mensaje de error si la actualización fue exitosa
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';

        } catch (error) {
            console.error('Error fetching crypto data:', error);
            errorMessage.textContent = `Error al actualizar datos: ${error.message}. Intentando de nuevo en 1 minuto.`;
            errorMessage.style.display = 'block';
        }
    }

    // Función para actualizar la interfaz
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

    // Función para cambiar la criptomoneda
    function changeCryptocurrency() {
        currentCrypto = cryptoSelect.value;
        createOrUpdateChart(currentCrypto);
        updateAllCryptoData();
    }

    // Evento para cambiar la criptomoneda
    cryptoSelect.addEventListener('change', changeCryptocurrency);

    // Actualizar datos cada minuto (60000 milisegundos)
    setInterval(updateAllCryptoData, 60000);

    // Inicialización
    createOrUpdateChart(currentCrypto);
    updateAllCryptoData();
});