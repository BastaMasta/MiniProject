from os import listdir
from os.path import isfile, join
import paho.mqtt.client as mqtt
import time

client = mqtt.Client("rpi_pubclient1")
flagger = 0

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT Server!")
    print("Beginning Message Broadcast")

def on_disconnect(client, userdata, rc):
    print("Disconnected from MQTT server")

def on_publish(client, userdata, mid):
    print(f"Message with mid : {mid} broadcasted successfully")

client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_publish = on_publish

mypath = "processed"

file_list = [f for f in listdir(mypath) if isfile(join(mypath, f))]

print(file_list)

def send_img(path):
    print(f'Sending image {path}')

    f = open(f"{mypath}/{path}", "rb")  # 3.7kiB in same folder
    fileContent = f.read()
    byteArr = bytearray(fileContent)

    try:
        pubMsg = client.publish(
            topic='esp32/board1',
            payload=byteArr,
            qos=0,
        )
        pubMsg.wait_for_publish()
    except Exception as e:
        print(e)

while True :
    for i in file_list:
        client.connect("192.168.43.221", 1883)
        time.sleep(1)
        # Code to publish Message
        send_img(i)
        time.sleep(1)
        client.disconnect()
        time.sleep(5)
    temp_filelist = [f for f in listdir(mypath) if isfile(join(mypath, f))]
    file_list = temp_filelist if file_list != temp_filelist else file_list
    time.sleep(1)