import time
import board
import displayio
import neopixel
import os
import ssl
import socketpool
import wifi
import adafruit_minimqtt.adafruit_minimqtt as MQTT
# Compatibility with both CircuitPython 8.x.x and 9.x.x.
# Remove after 8.x.x is no longer a supported release.
try:
    from i2cdisplaybus import I2CDisplayBus
except ImportError:
    from displayio import I2CDisplay as I2CDisplayBus

import terminalio

# can try import bitmap_label below for alternative
from adafruit_display_text import label
import adafruit_displayio_sh1107

displayio.release_displays()
# oled_reset = board.D9

# Use for I2C
i2c = board.I2C()  # uses board.SCL and board.SDA
# i2c = board.STEMMA_I2C()  # For using the built-in STEMMA QT connector on a microcontroller
display_bus = I2CDisplayBus(i2c, device_address=0x3C)

pixel = neopixel.NeoPixel(board.NEOPIXEL, 1)

main_feed = "esp32/board1"

# SH1107 is vertically oriented 64x128
WIDTH = 128
HEIGHT = 64
BORDER = 2

display = adafruit_displayio_sh1107.SH1107(
    display_bus, width=WIDTH, height=HEIGHT, rotation=0
)

time.sleep(1)

# Make the display context
splash = displayio.Group()
display.root_group = splash

color_bitmap = displayio.Bitmap(WIDTH, HEIGHT, 1)
color_palette = displayio.Palette(1)
color_palette[0] = 0xFFFFFF  # White

bg_sprite = displayio.TileGrid(color_bitmap, pixel_shader=color_palette, x=0, y=0)
splash.append(bg_sprite)

# Draw a smaller inner rectangle in black
inner_bitmap = displayio.Bitmap(WIDTH - BORDER * 2, HEIGHT - BORDER * 2, 1)
inner_palette = displayio.Palette(1)
inner_palette[0] = 0x000000  # Black
inner_sprite = displayio.TileGrid(
    inner_bitmap, pixel_shader=inner_palette, x=BORDER, y=BORDER
)
splash.append(inner_sprite)

text2 = " "
text_area2 = label.Label(
    terminalio.FONT, text=text2, scale=1, color=0xFFFFFF, x=6, y=15
)
splash.append(text_area2)



# Define callback methods which are called when events occur
# pylint: disable=unused-argument, redefined-outer-name
def connected(client, userdata, flags, rc):
    # This function will be called when the client is connected
    # successfully to the broker.
    print(f"Connected to MQTT Server! Listening for topic changes on {main_feed}")
    # Subscribe to all changes on the onoff_feed.
    client.subscribe(main_feed)


def disconnected(client, userdata, rc):
    # This method is called when the client is disconnected
    print("Disconnected from mqtt!")


def message(client, topic, message):
    # This method is called when a topic the client is subscribed to
    # has a new message.
    
    text_area2.text = message.format(time.monotonic())
    print("recieved message on esp/board1 : {0}".format(message))
    pixel.fill((0, 0, 255))
    time.sleep(1)
    pixel.fill((0,0,0))


# Create a socket pool
pool = socketpool.SocketPool(wifi.radio)
ssl_context = ssl.create_default_context()

mqtt_client = MQTT.MQTT(
    broker="192.168.43.221",
    port=1883,
    socket_pool=pool,
    ssl_context=ssl_context,
)

# Setup the callback methods above
mqtt_client.on_connect = connected
mqtt_client.on_disconnect = disconnected
mqtt_client.on_message = message


# Connect the client to the MQTT broker.
print("Connecting to MQTT Server")
mqtt_client.connect()



while True:
    mqtt_client.loop(timeout=1)
    

