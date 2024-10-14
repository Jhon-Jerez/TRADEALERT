document.addEventListener('DOMContentLoaded', function() {
    const btcValue = document.getElementById('btcValue');
    const changePercentage = document.getElementById('changePercentage');
    const arrow = changePercentage.querySelector('.arrow');
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Recuperar los datos previos del localStorage si existen
    let storedData = JSON.parse(localStorage.getItem('btcChartData')) || { labels: [], prices: [] };

    let chartData = {
        labels: storedData.labels, // Fechas (tiempo) almacenadas
        datasets: [{
            label: 'Bitcoin Price (USD)',
            data: storedData.prices, // Precios de Bitcoin almacenados
            borderColor: '#2196f3',
            tension: 0.1,
            fill: false
        }]
    };

    // Inicializar el gráfico
    const chart = new Chart(ctx, {
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
                            minute: 'HH:mm' // Formato de hora
                        }
                    },
                    ticks: {
                        // Mostrar etiquetas cada 5 minutos pero salen cada 10 quien sabe por que le movi algo y quedo asi
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
                    beginAtZero: false, // El eje Y no debe comenzar en 0 para precios
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    }
                }
            }
        }
    });

    // Función para actualizar los datos de BTC
    async function updateBTCData() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            const price = data.bitcoin.usd;
            const change = data.bitcoin.usd_24h_change;
            const now = new Date(); // Tiempo actual

            // Añadir nuevo dato a la gráfica
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(price);

            // Limitar a los últimos 30 puntos (30 minutos)
            if (chart.data.labels.length > 240) {
                chart.data.labels.shift(); // Eliminar el primer elemento
                chart.data.datasets[0].data.shift(); // Eliminar el primer dato
            }

            // Guardar los datos actualizados en el localStorage
            localStorage.setItem('btcChartData', JSON.stringify({
                labels: chart.data.labels,
                prices: chart.data.datasets[0].data
            }));

            chart.update(); // Actualizar el gráfico

            // Actualizar los valores de la interfaz
            btcValue.textContent = `BTC ${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const previousPrice = chart.data.datasets[0].data[chart.data.datasets[0].data.length - 2]; // Último precio antes del actual
            const priceDifference = (price - previousPrice).toFixed(2); // Diferencia en dólares
            const changeText = Math.abs(change).toFixed(2); // Cambio porcentual
            const isPositive = change >= 0;

            // Visualizar la diferencia de precio en dólares y el cambio porcentual
            arrow.textContent = isPositive ? '↑' : '↓';
            changePercentage.innerHTML = `
                <span class="arrow">${arrow.textContent}</span> 
                ${isPositive ? '+' : '-'}$${Math.abs(priceDifference)} (${changeText}%)
            `;
            changePercentage.style.color = isPositive ? '#4caf50' : '#f44336';

        } catch (error) {
            console.error('Error fetching BTC data:', error);
        }
    }

    // Actualizar datos cada minuto (60000 milisegundos)
    setInterval(updateBTCData, 60000);

    // Llamada inicial para mostrar datos
    updateBTCData();
});
