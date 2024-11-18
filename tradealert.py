from flask import Flask, render_template, request, redirect, session
import mysql.connector
from passlib.hash import sha256_crypt
import os
from dotenv import load_dotenv
from decimal import Decimal


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

@app.route('/iniciar', methods=['GET', 'POST'])
def iniciar():
    if request.method == 'POST':
        email = request.form['email']
        contraseña_inicio = request.form['contraseña']

        mycursor = mydb.cursor()
        sql = "SELECT nombres, contraseña, saldo FROM usuario WHERE email = %s"
        val = (email,)
        mycursor.execute(sql, val)
        usuario = mycursor.fetchone()

        if usuario:
            hash_contraseña = usuario[1]
            if sha256_crypt.verify(contraseña_inicio, hash_contraseña):
                session['email'] = email
                session['nombres'] = usuario[0]  
                session['saldo']= usuario[2]
                return redirect('/perfil')
            else:
                return 'Contraseña incorrecta'
        else:
            return 'Usuario no registrado'
    else:
        return render_template('iniciar.html')
    
@app.route('/perfil', methods=['GET', 'POST'])
def perfil():
    if 'email' not in session:
        return redirect('/login')
    else:
        if request.method == 'POST':
            saldo = Decimal(request.form['monto'])
            mycursor = mydb.cursor()
            saldo_actual=Decimal(session['saldo'])
            nuevo_saldo = saldo + saldo_actual
            sql = "UPDATE usuario SET saldo = %s WHERE email = %s"
            val = (nuevo_saldo, session['email'])
            mycursor.execute(sql, val)
            mydb.commit()
            session['saldo'] = nuevo_saldo
            return redirect('/perfil')

        else:
            return render_template('perfil.html')

@app.route('/api/saldo')
def api_saldo():
    if 'email' not in session:
        return {'error': 'No autorizado'}, 401

    try:
        mycursor = mydb.cursor()
        sql = "SELECT saldo FROM usuario WHERE email = %s"
        mycursor.execute(sql, (session['email'],))
        usuario = mycursor.fetchone()
        mycursor.close()

        if usuario:
            return {'saldo': float(usuario[0])}  # Convertimos Decimal a float
        else:
            return {'error': 'Usuario no encontrado'}, 404
    except mysql.connector.Error as err:
        print("Error al consultar el saldo:", err)
        return {'error': 'Error interno del servidor'}, 500



@app.route('/cuenta', methods=['GET', 'POST'])
def cuenta():
    mycursor = mydb.cursor()
    if 'email' not in session:
        return redirect('/login')
    
    if request.method == 'POST':
        try:
            nombres = request.form['actualizar-nombre']
            contraseña = request.form['actualizar-contraseña']
            pais = request.form['country']
                        
            if contraseña:
                hash_contraseña = sha256_crypt.hash(contraseña)
            
            if nombres:
                sql = "UPDATE usuario SET nombres = %s WHERE email = %s"
                val = (nombres, session['email'])
                mycursor.execute(sql, val)

            if contraseña:
                sql = "UPDATE usuario SET contraseña = %s WHERE email = %s"
                val = (hash_contraseña, session['email'])
                mycursor.execute(sql, val)
            
            if pais:
                sql = "UPDATE usuario SET pais = %s WHERE email = %s"
                val = (pais, session['email'])
                mycursor.execute(sql, val)

            mydb.commit()
        except mysql.connector.Error as err:
            print("Error al actualizar en la base de datos:", err)
    
    sql = "SELECT saldo FROM usuario WHERE email = %s"
    mycursor.execute(sql, (session['email'],))
    usuario = mycursor.fetchone()
    
    if usuario:
        session['saldo'] = usuario[0]
    
    mycursor.close()
    return render_template('usuario.html')


@app.route('/logout')
def logout():
    session.clear()
    return render_template('index.html')

#se inicializa la app flask
if __name__== '__main__':
    app.run(debug=True)
