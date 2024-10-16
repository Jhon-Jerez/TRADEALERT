from flask import Flask, render_template, request, redirect, session
import mysql.connector
from passlib.hash import sha256_crypt
import os
from dotenv import load_dotenv

load_dotenv()

app= Flask(__name__)
app.secret_key= os.getenv('SECRET_KEY')

#coneccion a la base de datos
mydb = mysql.connector.connect(
    host='127.0.0.1',
    user='root',
    password='',
    database='tradealert'
)



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/registro', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        try:
            nombres = request.form['nombres']
            email = request.form['email']
            contraseña = request.form['contraseña']
            hash_contraseña = sha256_crypt.hash(contraseña)


            mycursor = mydb.cursor()
            sql = "INSERT INTO usuario(nombres, email, contraseña) VALUES (%s, %s, %s)"
            val = (nombres, email, hash_contraseña)
            mycursor.execute(sql, val)
            mydb.commit()

            return redirect('/')
        except mysql.connector.Error as err:
            print("Error al insertar en la base de datos:", err)
    return render_template('registro.html')


@app.route('/iniciar', methods=['GET','POST'])
def iniciar():
    if request.method == 'POST':
        email=request.form['email']
        contraseña_inicio= request.form['contraseña']

        mycursor=mydb.cursor()
        sql="Select * FROM usuario WHERE  email= %s"
        val=(email,)
        mycursor.execute(sql, val)
        usuario= mycursor.fetchone()

        if usuario:
            hash_contraseña= usuario[2]
            if sha256_crypt.verify(contraseña_inicio,hash_contraseña):
                session['email']=email
                session['nombres']=usuario[0]
                return redirect('/perfil')
            else:
                return 'Contrasela incorrecta'
        else:
            return 'Usuario no registrado'
    else:
        return render_template('iniciar.html')    
    
@app.route('/perfil', methods=['GET', 'POST'])
def perfil():
    if 'email' not in session:
        return redirect('/iniciar')
    
    nombre_usuario = session.get('nombres', 'Usuario')
    return render_template('perfil.html', nombre_usuario=nombre_usuario)

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()  # Limpiar la sesión
    return redirect('/')


#se inicializa la app flask
if __name__== '__main__':
    app.run(debug=True)

