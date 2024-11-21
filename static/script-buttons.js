document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('modal');  
    const modalContent = document.getElementById('modal-body'); 

  
    function openModal(content) {
        modalContent.innerHTML = content; 
        modal.style.display = 'block';  
    }

    // Función para cerrar la ventana 
    document.querySelector('.close').addEventListener('click', function () {
        modal.style.display = 'none';    
    });

    document.getElementById('close').addEventListener('click', function () {
        modal.style.display = 'none';
    });


    document.querySelector('.btn-vender').addEventListener('click', function () {
        openModal(`
            <h2>Vender</h2>
            <form class="formulario-centro" action="/perfil" method="POST">
                <div class="form-group">
                    <label for="cripto-venta">Que cripto desea vender:</label>
                    <select class"cripto" id""cripto>
                        <option> Bitcoin</option>
                        <option> Cardano</option>
                        <option> Ethereum</option>
                        <option> Ripple</option>


                    </select>
                </div>
                <div class="form-group">
                    <label for="monto">Monto USD:</label>
                    <input type="number" id="monto" name="monto" step="0.01" required>
                </div>
                <button type="submit" class="btn btn-agregar">Vender</button>
            </form>
        `);
    });
    

});


document.addEventListener('DOMContentLoaded', function () {
    const cerrarSesion = document.getElementById('cerrarSesion');
    const logoutPopup = document.getElementById('logoutPopup');

    cerrarSesion.addEventListener('click', function () {
        logoutPopup.style.display = logoutPopup.style.display === 'block' ? 'none' : 'block';
    });

    window.addEventListener('click', function (e) {
        if (!cerrarSesion.contains(e.target) && !logoutPopup.contains(e.target)) {
            logoutPopup.style.display = 'none';
        }
    });
});