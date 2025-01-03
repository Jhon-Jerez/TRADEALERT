from flask import Flask, render_template, request, redirect, session, jsonify
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
            return {'saldo': float(usuario[0])} 
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

@app.route('/billetera', methods=['GET','POST'])
def billetera():
    mycursor = mydb.cursor()
    if 'email' not in session:
        return redirect('/login')

    sql = "SELECT criptomoneda, saldo FROM billetera WHERE usuario_id = %s"
    mycursor.execute(sql, (session['email'],)) 
    crypto_saldos = mycursor.fetchall()
    mycursor.close()

    return render_template('billetera.html', cryptos=crypto_saldos)

@app.route('/comprar', methods=['POST'])
def comprar():
    if 'email' not in session:
        return jsonify({'error': 'Usuario no autenticado'}), 401

    try:
        data = request.json
        crypto_symbol = data.get('cryptoSymbol')
        crypto_amount = data.get('cryptoAmount')
        monto = data.get('monto')

        if not crypto_symbol or not crypto_amount or not monto:
            return jsonify({'error': 'Datos faltantes'}), 400

        try:
            crypto_amount = Decimal(crypto_amount)
            monto = Decimal(monto)
        except Exception as e:
            return jsonify({'error': f'Error en la conversión de datos: {str(e)}'}), 400

        usuario_id = session['email']

        mycursor = mydb.cursor(dictionary=True)
        mycursor.execute("SELECT saldo FROM usuario WHERE email = %s", (usuario_id,))
        user_result = mycursor.fetchone()
        saldo_disponible = user_result['saldo'] if user_result else 0

        if saldo_disponible < monto:
            return jsonify({'error': 'Saldo insuficiente en USD'}), 400

        mycursor.execute("SELECT saldo FROM billetera WHERE usuario_id = %s AND criptomoneda = %s", (usuario_id, crypto_symbol))
        wallet_result = mycursor.fetchone()

        if wallet_result:
            wallet_balance = wallet_result['saldo']
        else:
            wallet_balance = Decimal('0.00000000')

        new_wallet_balance = wallet_balance + crypto_amount

        if wallet_result:
            mycursor.execute("UPDATE billetera SET saldo = %s WHERE usuario_id = %s AND criptomoneda = %s", (new_wallet_balance, usuario_id, crypto_symbol))
        else:
            mycursor.execute("INSERT INTO billetera (usuario_id, criptomoneda, saldo) VALUES (%s, %s, %s)", (usuario_id, crypto_symbol, crypto_amount))


        mycursor.execute("""INSERT INTO compra_cripto (usuario_id, criptomoneda, cantidad, precio_unitario, total) 
                           VALUES (%s, %s, %s, %s, %s)""", 
                           (usuario_id, crypto_symbol, crypto_amount, monto / crypto_amount, monto))

        mycursor.execute("UPDATE usuario SET saldo = saldo - %s WHERE email = %s", (monto, usuario_id))

        mydb.commit()
        return jsonify({'message': 'Compra procesada correctamente.'})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({'error': f'Error en la compra: {str(e)}'}), 500

@app.route('/api/reportes')
def reportes():
    mycursor = mydb.cursor()
    if 'email' not in session:
        return redirect('/login')

    mycursor.execute("SELECT criptomoneda,cantidad,precio_unitario, fecha FROM compra_cripto")  # Asume que tienes una tabla `compras_cripto`
    compra = mycursor.fetchall()

    mycursor.close()
    print(compra)

    return (compra)
            

@app.route('/logout')
def logout():
    session.clear()
    return render_template('index.html')

#se inicializa la app flask
if __name__== '__main__':
    app.run(debug=True)
