document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('modal');  
    const modalContent = document.getElementById('modal-body'); 
    const loading = document.getElementById('loading'); 
    const cryptoSelect = document.getElementById('cryptoSelect');
    let currentCrypto = 'bitcoin';
  

    // Función para abrir la ventana modal
    function openModal(content) {
        modalContent.innerHTML = content; 
        modal.style.display = 'block';  
    }

    // Función para cerrar la ventana 
    document.querySelector('.close').addEventListener('click', function () {
        modal.style.display = 'none';     // Ocultar el modal
    });

    // Botón para agregar dinero
    document.querySelector('.btn-primary').addEventListener('click', function () {
        openModal('<h2>Agregar dinero</h2><p>Formulario para agregar dinero...</p>');
    });

    // Botón para comprar o vender
    document.querySelector('.btn-secondary').addEventListener('click', function () {
        openModal('<h2>Comprar / Vender</h2><p>Formulario para comprar o vender...</p>');
    });

    // Botón para el automata
    document.querySelector('.btn-automata').addEventListener('click', async function () {
        openModal('');  // Muestra el modal sin contenido inicial
        loading.style.display = 'block';  // Muestra el spinner de carga
    
        // Esperar un momento para simular la carga
        await new Promise(resolve => setTimeout(resolve, 2000));  // Espera 2 segundos
    
        // Construir la key usando currentCrypto
        const storageKey = `${currentCrypto}ChartData`;
        
        // Obtener los datos de la criptomoneda seleccionada del localStorage
        let storedData = JSON.parse(localStorage.getItem(storageKey));
        if (!storedData || storedData.labels.length === 0) {
            alert("No hay datos disponibles para la criptomoneda seleccionada.");
            loading.style.display = 'none';
            return;
        }
    
        // Convertir las etiquetas y precios en arreglos de fechas y precios
        const dates = storedData.labels.map(label => new Date(label));
        const prices = storedData.prices;
    
        // Realizar la regresión lineal
        const regressionResult = performLinearRegression(dates, prices);
        const currentPrice = prices[prices.length - 1];  // Último precio conocido
        const predictedPrice = regressionResult.predictedNextPrice;  // Precio predictivo
        const decision = getTradingDecision(currentPrice, predictedPrice);
    
        // Oculta la animación de carga
        loading.style.display = 'none';
    
        // Muestra la decisión y el precio predictivo
        openModal(`
            <p><strong>Consejo:</strong> ${decision}</p>
            <p><strong>Precio actual:</strong> ${currentPrice.toFixed(2)} USD</p>
            <p><strong>Precio predictivo (5 minutos):</strong> ${predictedPrice.toFixed(2)} USD</p>
            <p><strong>Por qué:</strong> ${decision === 'Comprar' ? 'Se espera que el precio suba.' : decision === 'Vender' ? 'Se espera que el precio baje.' : 'El precio se mantiene estable.'}</p>
        `);
        
    });
    

    // Función para realizar la regresión lineal (simplificada)
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

    function changeCryptocurrency() {
        currentCrypto = cryptoSelect.value;
        createOrUpdateChart(currentCrypto);
        updateAllCryptoData();
    }

    // Evento para cambiar la criptomoneda
    cryptoSelect.addEventListener('change', changeCryptocurrency);
});
