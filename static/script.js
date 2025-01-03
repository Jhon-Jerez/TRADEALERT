document.addEventListener('DOMContentLoaded', function() {
    const cryptoValue = document.getElementById('btcValue');
    const changePercentage = document.getElementById('changePercentage');
    const arrow = changePercentage.querySelector('.arrow');
    const ctx = document.getElementById('salesChart').getContext('2d');
    const cryptoSelect = document.getElementById('cryptoSelect');
    const errorMessage = document.getElementById('errorMessage');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-body');
    const loading = document.getElementById('loading');
    let currentCrypto = 'bitcoin';
    const supportedCryptos = ['bitcoin', 'ethereum', 'ripple', 'cardano'];
    let chart;
   


    // Función para crear o actualizar el gráfico
    function createOrUpdateChart(crypto) {
        let storedData = JSON.parse(localStorage.getItem(`${crypto}ChartData`)) || { labels: [], prices: [] };
        let labelsAsDates = storedData.labels.map(label => new Date(label));

        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, 'rgba(33, 150, 243, 0.8)');

        let chartData = {
            labels: labelsAsDates,
            datasets: [{
                label: `${crypto.charAt(0).toUpperCase() + crypto.slice(1)} Price (USD)`,
                data: storedData.prices,
                borderColor: '#2196f3',
                tension: 0.1,
                backgroundColor: gradient,
                borderWidth: 1,
                fill: true
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
                                autoSkip: true,
                                callback: (value) => {
                                    const labelDate = new Date(value);
                                    return labelDate.getMinutes() % 5 === 0 ? labelDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                                }
                            }
                            ,
                            title: {
                                display: true,
                                text: 'Hora'
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
        const formattedPrice = `${crypto.toUpperCase()} ${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  (USD)`;
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

    // Funciones para el modal
    function openModal(content) {
        modalContent.innerHTML = content;
        modal.style.display = 'block';
    }

    document.getElementById('close').addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Botones de acción
    document.querySelector('.btn-primary').addEventListener('click', function () {
        openModal(`
            <h2>Agregar dinero</h2>
            <form class="formulario-centro" action="/perfil" method="POST">
                <div class="form-group">
                    <label for="monto">Monto USD:</label>
                    <input type="number" id="monto" name="monto" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="metodo-pago">Método de pago:</label>
                    <div class="radio-buttons">
                        <input type="radio" id="creditCard" name="metodo-pago" value="creditCard" required>
                        <label for="creditCard">Tarjeta de crédito</label><br>

                        <input type="radio" id="paypal" name="metodo-pago" value="paypal">
                        <label for="paypal">PayPal</label><br>
                        <input type="radio" id="bankTransfer" name="metodo-pago" value="bankTransfer">
                        <label for="bankTransfer">Transferencia bancaria</label><br>
                    </div>
                </div>
                <button type="submit" class="btn btn-agregar">Agregar</button>
            </form>
        `);
    });
    

    document.querySelector('.btn-secondary').addEventListener('click', function () {
        fetch('/api/saldo')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al obtener el saldo');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
    
                const saldo = data.saldo.toFixed(2);
                const currentPrice = JSON.parse(localStorage.getItem(`${currentCrypto}ChartData`)).prices.slice(-1)[0]; // Precio actual
                const cryptoSymbol = currentCrypto.charAt(0).toUpperCase() + currentCrypto.slice(1);
    
                openModal(`
                    <h2>Comprar</h2>
                    <form id="transactionForm">
                        <div class="balance">Saldo: $${saldo} USD</div>
                        <div class="form-group-venta">
                            <label for="monto">Monto en USD:</label>
                            <input type="number" id="monto" name="monto" step="0.01" required>
                        </div>
                        <div class="form-group-venta">
                            <label> Cantidad estimada:<p id="calculatedAmount">0 ${cryptoSymbol}</p></label>
                        </div>
                        <button type="button" id="submitTransaction" class="btn btn-agregar">Confirmar</button>
                    </form>
                `);
    
                const montoInput = document.getElementById('monto');
                const calculatedAmount = document.getElementById('calculatedAmount');
                const submitButton = document.getElementById('submitTransaction');
    
                montoInput.addEventListener('input', function () {
                    const monto = parseFloat(montoInput.value) || 0; // Obtener valor del input
                    const cryptoAmount = (monto / currentPrice).toFixed(8); // Cantidad calculada
                    calculatedAmount.textContent = `${cryptoAmount} ${cryptoSymbol}`;
                });
    
                submitButton.addEventListener('click', function () {
                    const monto = parseFloat(montoInput.value) || 0; // Obtener valor del input
                    const cryptoAmount = (monto / currentPrice).toFixed(8);
    
                    if (monto > saldo) {
                        alert('Saldo insuficiente.');
                        return;
                    }
    
                    fetch('/comprar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            cryptoSymbol: cryptoSymbol,
                            cryptoAmount: cryptoAmount,
                            monto: monto,
                        }),
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Error al realizar la compra');
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                        } else {
                            alert(data.message);
  
                        }
                    })
                    .catch(error => {
                        alert('Hubo un problema al realizar la compra.');
                    });
                });
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Hubo un problema al cargar el saldo.');
            });
    });    
    

    // modal.addEventListener('click', function() {
    //     modal.style.display = 'none';
    // });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.querySelector('.btn-automata').addEventListener('click', async function () {
        openModal('Analizando datos...');
        loading.style.display = 'block';
    
        await new Promise(resolve => setTimeout(resolve, 2000));
    
        const storageKey = `${currentCrypto}ChartData`;
        let storedData = JSON.parse(localStorage.getItem(storageKey));
        if (!storedData || storedData.labels.length === 0) {
            alert("No hay datos disponibles para la criptomoneda seleccionada.");
            loading.style.display = 'none';
            return;
        }
    
        const dates = storedData.labels.map(label => new Date(label));
        const prices = storedData.prices;
    
        const regressionResult = performLinearRegression(dates, prices);
        const currentPrice = prices[prices.length - 1];
        const predictedPrice = regressionResult.predictedNextPrice;
        const decision = getTradingDecision(currentPrice, predictedPrice);
    
        loading.style.display = 'none';
    
        openModal(`
            <p><strong>Consejo:</strong> ${decision}</p>
            <p><strong>Precio actual:</strong> ${currentPrice.toFixed(2)} USD</p>
            <p><strong>Precio predictivo (5 minutos):</strong> ${predictedPrice.toFixed(2)} USD</p>
            <p><strong>Por qué:</strong> ${decision === 'Comprar' ? 'Se espera que el precio suba.' : decision === 'Vender' ? 'Se espera que el precio baje.' : 'El precio se mantiene estable.'}</p>
        `);
    });

    // Regresión lineal
    function performLinearRegression(dates, prices) {
        const n = prices.length;
        const X = dates.map(date => date.getTime());
        const Y = prices;

        const meanX = X.reduce((a, b) => a + b, 0) / n;
        const meanY = Y.reduce((a, b) => a + b, 0) / n;

        let num = 0, denom = 0;
        for (let i = 0; i < n; i++) {
            num += (X[i] - meanX) * (Y[i] - meanY);
            denom += (X[i] - meanX) * (X[i] - meanX);
        }
        const slope = num / denom;
        const intercept = meanY - (slope * meanX);

        const lastDate = X[X.length - 1];
        const predictedNextPrice = slope * (lastDate + 300000) + intercept; 

        return { slope, intercept, predictedNextPrice };
    }

    // Función para tomar la decisión de compra/venta según la regresión
    function getTradingDecision(currentPrice, predictedPrice) {
        if (predictedPrice > currentPrice) {
            return 'Comprar';
        } else if (predictedPrice < currentPrice) {
            return 'Vender';
        } else {
            return 'Mantenerse';
        }
    }

    // Event listeners
    cryptoSelect.addEventListener('change', changeCryptocurrency);

    // Actualizar datos cada minuto
    setInterval(updateAllCryptoData, 60000);

    // Inicialización
    createOrUpdateChart(currentCrypto);
    updateAllCryptoData();
});

document.addEventListener('DOMContentLoaded', function() {
    const cerrarSesion = document.getElementById('cerrarSesion');
    const logoutPopup = document.getElementById('logoutPopup');

    cerrarSesion.addEventListener('click', function() {
        logoutPopup.style.display = logoutPopup.style.display === 'block' ? 'none' : 'block';
    });


});

document.addEventListener('DOMContentLoaded', function() {
    const btnVerReportes = document.querySelector('.view-report');
    const modal = document.getElementById('modalReportes');
    const closeReportes = document.getElementById('closeReportes');
    
    btnVerReportes.addEventListener('click', function() {
        // Abrir el modal
        modal.style.display = 'block';

        // Mostrar el spinner mientras se obtienen los datos
        document.getElementById('loading').style.display = 'block';

        fetch('/api/reportes')
            .then(response => response.json())
            .then(data => {
                const tbody = document.querySelector('#tablaReportes tbody');
                tbody.innerHTML = '';
                data.forEach(compra => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${compra[0]}</td>
                        <td>${compra[1]}</td>
                        <td>${compra[2]}</td>
                        <td>${compra[3]}</td>
                    `;
                    tbody.appendChild(tr);
                });

                // Ocultar el spinner cuando los datos estén cargados
                document.getElementById('loading').style.display = 'none';
            })
            .catch(error => {
                console.error('Error al obtener los reportes:', error);
                // Ocultar el spinner si hay error
                document.getElementById('loading').style.display = 'none';
            });
    });

    closeReportes.addEventListener('click', function() {
        modal.style.display = 'none';
    });


});

