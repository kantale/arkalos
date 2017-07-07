import requests
import time
import json
import sys

def run(command):
	'''
	python /Users/alexandroskanterakis/github/arkalos/test_2.py 3 p1
	'''

	while True:
		print "GET IDLE:"
		r = requests.post("http://127.0.0.1:8080", data=json.dumps({'action': 'GET IDLE'}))
		#print r.ok
		print r.json()
		p_index = r.json()['p_index']
		print "====================="
		if p_index != 'NONE':
			break



	print "SUBMIT:"
	r = requests.post("http://127.0.0.1:8080", data=json.dumps({'action': 'SUBMIT', 'p_index': p_index, 'task': command}))
	#print r.ok
	print r.json()
	print "====================="


	while True:
		print "GET OUTPUT"
		r = requests.post("http://127.0.0.1:8080", data=json.dumps({'action': 'GET OUTPUT', 'p_index': p_index}))
		#print r.ok
		j =  r.json()
		print j
		print '====================='
		if j['last']:
			break
		time.sleep(1)


run(sys.argv[1])