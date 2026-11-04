#!/usr/bin/env python3
'''
dht11.py — Lecture du DHT11 pour le labo 1 (GTI700, volet applicatif)
Basé sur dht11.py de SunFounder (2016). Modifications :
  - sortie au format "temp,hum" (une ligne par mesure, flush immédiat) pour Node.js
  - une mesure toutes les 3 s, nouvel essai après 1 s si la lecture échoue
  - conservation de la partie décimale (octets 1 et 3)
  - libération du GPIO sur SIGTERM (arrêt par Node)
'''
import RPi.GPIO as GPIO
import time
import signal
import sys

DHTPIN = 17          # numérotation BCM
INTERVALLE = 3       # secondes entre deux mesures valides

GPIO.setmode(GPIO.BCM)

MAX_UNCHANGE_COUNT = 100

STATE_INIT_PULL_DOWN = 1
STATE_INIT_PULL_UP = 2
STATE_DATA_FIRST_PULL_DOWN = 3
STATE_DATA_PULL_UP = 4
STATE_DATA_PULL_DOWN = 5

def read_dht11_dat():
	GPIO.setup(DHTPIN, GPIO.OUT)
	GPIO.output(DHTPIN, GPIO.HIGH)
	time.sleep(0.05)
	GPIO.output(DHTPIN, GPIO.LOW)
	time.sleep(0.02)
	GPIO.setup(DHTPIN, GPIO.IN, GPIO.PUD_UP)

	unchanged_count = 0
	last = -1
	data = []
	while True:
		current = GPIO.input(DHTPIN)
		data.append(current)
		if last != current:
			unchanged_count = 0
			last = current
		else:
			unchanged_count += 1
			if unchanged_count > MAX_UNCHANGE_COUNT:
				break

	state = STATE_INIT_PULL_DOWN

	lengths = []
	current_length = 0

	for current in data:
		current_length += 1

		if state == STATE_INIT_PULL_DOWN:
			if current == GPIO.LOW:
				state = STATE_INIT_PULL_UP
			else:
				continue
		if state == STATE_INIT_PULL_UP:
			if current == GPIO.HIGH:
				state = STATE_DATA_FIRST_PULL_DOWN
			else:
				continue
		if state == STATE_DATA_FIRST_PULL_DOWN:
			if current == GPIO.LOW:
				state = STATE_DATA_PULL_UP
			else:
				continue
		if state == STATE_DATA_PULL_UP:
			if current == GPIO.HIGH:
				current_length = 0
				state = STATE_DATA_PULL_DOWN
			else:
				continue
		if state == STATE_DATA_PULL_DOWN:
			if current == GPIO.LOW:
				lengths.append(current_length)
				state = STATE_DATA_PULL_UP
			else:
				continue
	if len(lengths) != 40:
		return False

	shortest_pull_up = min(lengths)
	longest_pull_up = max(lengths)
	halfway = (longest_pull_up + shortest_pull_up) / 2
	bits = []
	the_bytes = []
	byte = 0

	for length in lengths:
		bit = 0
		if length > halfway:
			bit = 1
		bits.append(bit)
	for i in range(0, len(bits)):
		byte = byte << 1
		if (bits[i]):
			byte = byte | 1
		else:
			byte = byte | 0
		if ((i + 1) % 8 == 0):
			the_bytes.append(byte)
			byte = 0
	checksum = (the_bytes[0] + the_bytes[1] + the_bytes[2] + the_bytes[3]) & 0xFF
	if the_bytes[4] != checksum:
		return False

	# Octets : [hum_entier, hum_decimal, temp_entier, temp_decimal, checksum]
	humidity = the_bytes[0] + the_bytes[1] / 10
	temperature = the_bytes[2] + (the_bytes[3] & 0x7F) / 10
	if the_bytes[3] & 0x80:          # bit de signe (températures négatives)
		temperature = -temperature
	return humidity, temperature

def main():
	while True:
		result = read_dht11_dat()
		if result:
			humidity, temperature = result
			# Une ligne "temp,hum" ; flush pour que Node la reçoive immédiatement
			print(f"{temperature:.1f},{humidity:.1f}", flush=True)
			time.sleep(INTERVALLE)
		else:
			time.sleep(1)            # le DHT11 exige >= 1 s entre deux lectures

def destroy():
	GPIO.cleanup()

def _stop(*_):
	# Node arrête le processus avec SIGTERM (pas Ctrl+C) : on libère le GPIO
	destroy()
	sys.exit(0)

signal.signal(signal.SIGTERM, _stop)

if __name__ == '__main__':
	try:
		main()
	except KeyboardInterrupt:
		destroy()
