

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('modal');  // Cambié de 'myModal' a 'modal'
    const modalContent = document.getElementById('modal-body'); // Cambié de 'modalContent' a 'modal-body'

    // Función para abrir la ventana
    function openModal(content) {
        modalContent.innerHTML = content; 
        modal.style.display = 'block';  
    }

    // Función para cerrar la ventana emergente
    document.querySelector('.close').addEventListener('click', function () {
        modal.style.display = 'none';     // Ocultar el modal
    });

    // 
    document.querySelector('.btn-primary').addEventListener('click', function () {
        openModal('<h2>Agregar dinero</h2><p>Formulario para agregar dinero...</p>');
    });

    document.querySelector('.btn-secondary').addEventListener('click', function () {
        openModal('<h2>Comprar / Vender</h2><p>Formulario para comprar o vender...</p>');
    });

    document.querySelector('.btn-automata').addEventListener('click', async function () {
        openModal('');  // Muestra el modal sin contenido inicial
        loading.style.display = 'block';  // Muestra el spinner de carga

        // Simular la espera de procesamiento (regresión lineal)
        await new Promise(resolve => setTimeout(resolve, 2000));  // Espera 2 segundos

        // Obtener datos del localStorage o llamarlos de una API
        let storedData = JSON.parse(localStorage.getItem('cryptoData'));
        if (!storedData) {
            alert("No hay datos disponibles.");
            loading.style.display = 'none';
            return;
        }

        // Realizar regresión lineal (simplificado)
        const decision = realizarRegresionYTomarDecision(storedData);

        // Oculta la animación de carga
        loading.style.display = 'none';

        // Muestra la decisión
        openModal(`La decisión es: ${decision}`);
    });

    // Función para hacer la regresión lineal y tomar decisiones
    function realizarRegresionYTomarDecision(data) {
        // Aquí puedes hacer un análisis más detallado
        let ultimaVariacion = data[data.length - 1].variacion;
        
        // Ejemplo de reglas de inferencia simples
        if (ultimaVariacion > 0) {
            return "Vender";
        } else if (ultimaVariacion < 0) {
            return "Comprar";
        } else {
            return "Mantenerse";
        }
    }

});