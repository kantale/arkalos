'''
An effort to build a proccess pool that tests ARKALOS TOOLS/DATA
VERY EXPERIMENTAL!
'''

import json
import time
import shlex

from multiprocessing import Queue as process_Queue
from multiprocessing import Process

from queue import Queue as threading_queue
from threading import Thread

import subprocess

#from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from http.server import BaseHTTPRequestHandler, HTTPServer

def execute(cmd):
	'''
	https://stackoverflow.com/questions/4417546/constantly-print-subprocess-output-while-process-is-running
	'''

	args = shlex.split(cmd)
	popen = subprocess.Popen(args, stdout=subprocess.PIPE, universal_newlines=True)

	for line in popen.stdout:
		yield line

	popen.stdout.close()

def execute_thread(q, cmd):
	
	execute_generator = execute(cmd)

	for line in execute_generator:
		#print ('#### ' + line)
		q.put(line)

	q.put('ARKALOS||FINISHED')

#def thread_worker(q, task):
#
#	t = Thread(target=execute_thread)
#
#	q.put({'m': 'started'})
#	time.sleep(10)

def process_worker(q_input, q_output, my_id,):
	'''
	thread worker function
	'''

	t = None
	last_put = None
	while True:
		# Is the queue empty?
		if q_input.empty():
			print('Worker: {} . EMPTY QUEUE'.format(my_id))
			if not last_put == 'IDLE':
				q_output.put('IDLE')
				last_put = 'IDLE'
		else:
			message = q_input.get()
			if 'ACTION' in message:
				action = message['ACTION']
				if action == 'START':
					task = message['TASK']
					worker_queue = threading_queue()
					print ("WORKER: {} STARTING TASK: {}".format(my_id, task))
					t = Thread(target=execute_thread, args=(worker_queue, task))
					t.start()

					while True:
						if worker_queue.empty():
							if not last_put == 'WORKING EMPTY':
								q_output.put("WORKING EMPTY")
								last_put = "WORKING EMPTY"
						else:
							line = worker_queue.get()
							if line == 'ARKALOS||FINISHED':
								q_output.put(line)
								last_put = line
								break
							else:
								q_output.put('ARKALOS||OUTPUT||' + line)
								last_put = line

						time.sleep(1)

					t = None


			#print('Worker: {} . NOT EMPTY QUEUE'.format(my_id))
		time.sleep(1)


def start_pool(num=3):
	#Start the processes
	pool = []
	for i in range(num):
		#parent_conn, child_conn = Pipe()
		q_input = process_Queue()
		q_output = process_Queue()
		p = Process(target=process_worker, args=(q_input, q_output, i))
		p.daemon = False

		p.start()
		#p.join()
		pool.append({'p': p, 'q_input': q_input, 'q_output': q_output})

	print ('POOLS STARTED')
	return pool

def main_process(q_input, q_output):

	pool = start_pool()
	next_idle = None
	#state = {} # Not used 
	messages = {}

	while True:

		for p_index, p in enumerate(pool):
			if p['q_output'].empty():
				pass # Do nothing 

			else:
				p_message = p['q_output'].get()

				if p_message == 'IDLE':
					next_idle = p_index
				elif p_message == 'WORKING EMPTY':
					#state[p_index] = 'WORKING EMPTY'
					pass
				elif 'ARKALOS||OUTPUT||' in p_message or p_message == 'ARKALOS||FINISHED':
					p_message = p_message.replace('ARKALOS||OUTPUT||', '')

					if not p_index in messages:
						messages[p_index] = ''

					messages[p_index] += p_message
				else:
					raise Exception('This should not happen')



		if q_input.empty():
			pass # Do nothing
		else:
			message = q_input.get()
			if message['ACTION'] == 'GET EMPTY':
				if next_idle is None:
					q_output.put('NONE')
				else:
					q_output.put(str(next_idle))
			elif message['ACTION'] == 'SUBMIT':
				submit_process = int(message['p_index'])
				pool[submit_process]['q_input'].put({
					'ACTION': 'START',
					'TASK': message['TASK']
					})
			elif message['ACTION'] == 'GET OUTPUT':
				submit_process = int(message['p_index'])
				if not submit_process in messages:
					q_output.put('ARKALOS||NONE')
				else:
					this_messages = messages[submit_process]
					q_output.put(this_messages)
					if 'ARKALOS||FINISHED' in this_messages:
						pass
					messages[submit_process] = ''
			else:
				raise Exception('Unknown Command : {}'.format(message['action']))

		time.sleep(1)

def main_process_get_output(q_input, q_output, idle_process):
	q_input.put({'ACTION': 'GET OUTPUT', 'p_index': idle_process})

	while True:
		if q_output.empty():
			pass # Do nothing
		else:
			message = q_output.get()
			print ('MAIN PROCESS RECEIVED: ', message)
			break

		time.sleep(1)

	return message

def main_process_get_idle_process(q_input, q_output):
	q_input.put({'ACTION': 'GET EMPTY'})

	while True:
		if q_output.empty():
			pass # Do nonthing
		else:
			message = q_output.get()
			print ('MAIN PROCESSED RECEIVED: ', message)
			idle_process = int(message)
			break

		time.sleep(1)

	return idle_process

def main_process_submit(q_input, idle_process, task):
	q_input.put({'ACTION': 'SUBMIT', 'p_index': idle_process, 'TASK': task})

def main_process_run_task(q_input, q_output, task):
	idle_process = main_process_get_idle_process(q_input, q_output)
	print ('IDLE PROCESS:', idle_process)
	main_process_submit(q_input, idle_process, task)

	while True:
		output = main_process_get_output(q_input, q_output, idle_process)
		print ('IDLE PROCESS: {} OUTPUT: {}'.format(idle_process, output))
		if 'ARKALOS||FINISHED' in output.split('\n'):
			break

		time.sleep(1)

	print ('IDLE PROCESS: {} FINISHED '.format(idle_process))


def test_main_process():
	q_input = process_Queue()
	q_output = process_Queue()

	p = Process(target=main_process, args=(q_input, q_output))
	p.start()

	time.sleep(1)
	main_process_run_task(q_input, q_output, 'ls -l')



class S(BaseHTTPRequestHandler):
	'''
	https://gist.github.com/bradmontgomery/2219997
	'''

	def _set_headers(self):
		self.send_response(200)
		self.send_header('Content-type', 'text/html')
		self.end_headers()

	def do_POST(self):
		'''
		TODO: check origin
		'''
		
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		print (post_data)

		try:
			data = json.loads(post_data)
		except Exception as e:
			print ('Could not parse JSON DATA..')
			

		self._set_headers()
		self.wfile.write(b"<html><body><h1>POST!</h1></body></html>")

def run(server_class=HTTPServer, handler_class=S, port=8080):
	server_address = ('', port)
	httpd = server_class(server_address, handler_class)
	print ('Starting httpd : http://127.0.0.1:{}'.format(port))
	httpd.serve_forever()

if __name__ == '__main__':
#	run()

	#start_pool()

#	for i in execute('ls -l'):
#		print ('Recieved: {}'.format(i))

	test_main_process()
