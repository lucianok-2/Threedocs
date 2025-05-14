document.getElementById('login-btn').addEventListener('click', async function () {
    const email = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    
    try {
        console.log("Enviando a /auth:", { email, password });

        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
    
        const result = await response.json();
    
        if (response.ok) {
            // Guardar el token en localStorage en lugar de sessionStorage para mayor persistencia
            localStorage.setItem('token', result.token);
            
            // Configurar el token como header por defecto para futuras peticiones
            const token = result.token;
            
            // Redireccionar al dashboard con el token como parámetro de consulta
            window.location.href = `/dashboard?token=${token}`;
        } else {
            alert(result.message || 'Error de autenticación');
        }
    } catch (error) {
        console.error('Error en la autenticación:', error);
        alert('Error al conectar con el servidor');
    }
});