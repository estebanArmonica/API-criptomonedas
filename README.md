
# Api de Criptomonedas

Hola a todos quiénes decidan ver este repositorio, esta es una API de criptomonedas el cual tiene el fin de utilizarse de forma personal en el mundo de las criptomonedas. Utilizando la API de Coingecko para obtener los datos de todas las criptomonedas y los precios por 1h y 24h en tiempo real.

Para empezar se utilizaron estas herramientas para desarrollar dicho proyecto:

- [ ]  Python 3.12.6 [https://www.python.org/]
- [ ]  Visual Studio Code [https://code.visualstudio.com/]
- [ ]  FastAPI [https://fastapi.tiangolo.com/]
- [ ]  Docker

## Variables de Entorno

Este proyecto utiliza variables de entorno para realizar peticiones y mensajes al correo electronico cuando la EMA (Media Móvil Exponencial) detecta un porcentaje para comprar o vender criptomonedas en tiempo real.

Para esto se necesita las siguientes variables de entorno

`SMTP_SERVER` el cual especifica que tipo de servidor se utilizara para realizar peticiones a correos electronicos.

`SMTP_PORT` el puerto del servidor de los correos electronicos

`EMAIL_USER` su correo electronico

`EMAIL_PASSWORD` la contraseña de dos pasos que debe realizar para colocarlo en esta variable de entorno.


## Arrancar el proyecto

Para arrancar este proyecto primero debemos realizar ciertos pasos:

Lo primero es que necesitamos clonar el proyecto del Github

```bash
git clone https://github.com/estebanArmonica/API-criptomonedas.git
```

al realizar la clonación del repositorio, debemos instalar las dependencias del `requirements.txt`, pero antes de realizar la instalación de las dependencias debemos levantar la maquina virtual del proyecto

```bash
# para levantar la maquina virtual
venv\Scripts\activate

# para apagar la maquina virtual
venv\Scripts\deactivate

# instalamos las dependencias una vez levantada la maquina virtual
pip install -r requirements.txt
```

una vez realizada la instalación de las dependencias necesarias, lavantaremos el proyectopero dentro de la carpeta `src`

```bash
# copiamos el comando para levantar el proyecto con uvicorn
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
una vez levantado del proyecto el `0.0.0.0` en el navegador lo puede cambiar por cualquier otro número.

## Documentación

Aqui esta toda la Documentación sobre como se realizo el proyecto:

[FastAPI](https://fastapi.tiangolo.com/tutorial/)

[Coingecko API](https://docs.coingecko.com/reference/introduction)

## Autores

- [esteban.hernan.lobos@gmail.com](esteban.hernan.lobos@gmail.com)