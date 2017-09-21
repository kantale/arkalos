'''
An effort to build a proccess pool that tests ARKALOS TOOLS/DATA
VERY EXPERIMENTAL!
'''

import os
import pty
import sys
import json
import time
import errno
import shlex
import traceback

from select import select

from multiprocessing import Queue as process_Queue
from multiprocessing import Process

from queue import Queue as threading_queue
from threading import Thread

import subprocess

#from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from http.server import BaseHTTPRequestHandler, HTTPServer

from ark_docker import build_image_script

def execute2(cmd):
    '''
    Adapted from
    https://stackoverflow.com/a/31968411/5626738
    '''

    stdout = ''
    stderr = ''
    command = shlex.split(cmd)
    masters, slaves = zip(pty.openpty(), pty.openpty())
    p = subprocess.Popen(command, stdin=slaves[0], stdout=slaves[0], stderr=slaves[1])
    for fd in slaves: 
        os.close(fd)

    readable = { masters[0]: sys.stdout, masters[1]: sys.stderr }
    try:
        print (' ######### REAL-TIME ######### ')
        while readable:
            for fd in select(readable, [], [])[0]:
            
                try:
                    data = os.read(fd, 1024)
                except OSError as e:
                    if e.errno != errno.EIO: 
                    	raise
                    del readable[fd]
                finally:
                    if not data: 
                        del readable[fd]
                    else:
                        new_data = data.decode('ascii')
                        if fd == masters[0]: 
                            stdout += new_data
                            yield 0, new_data
                        else: 
                            stderr += new_data
                            yield 1, new_data

                        if fd in readable:
                            readable[fd].write(str(data))
                            readable[fd].flush()
    except Exception as e:
        print (traceback.print_exc(file=sys.stdout))
    finally:
        p.wait()
        for fd in masters: 
            os.close(fd)
        #print ('')
        #print (' ########## RESULTS ########## ')
        #print ('STDOUT:')
        #print (stdout)
        #print ('STDERR:')
        #print (stderr)


def execute(cmd):
	'''
	https://stackoverflow.com/questions/4417546/constantly-print-subprocess-output-while-process-is-running
	'''


	args = shlex.split(cmd)
#	popen = subprocess.Popen(args, stdout=subprocess.PIPE, universal_newlines=True)
	
	with subprocess.Popen(args, stdout=subprocess.PIPE, universal_newlines=True) as popen:
		for line in popen.stdout:
			yield line

		popen.stdout.close()

def execute_thread(q, cmd, validate):
	
	image_script = build_image_script(cmd, validate)

	for std_kind, line in execute2(image_script):
		#print ('#### ' + line)

		if std_kind == 0:
			pass #STDOUT TODO
		elif std_kind == 1:
			pass #STDERR TODO 
		else:
			raise Exception('This should never happen')


		q.put(line)
		print ('EXECUTING THREAD. JUST ADDED LINE: {}:{}'.format({0:'STDOUT', 1:'STDERR'}[std_kind], line))

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
	busy = False
	current_data = ''

	while True:
		# Is the queue empty?
		if q_input.empty():
			pass # DO NOTHING
		else:
			message = q_input.get()
			if 'ACTION' in message:
				action = message['ACTION']
				if action == 'START':
					task = message['TASK']
					validate = message['VALIDATE']
					worker_queue = threading_queue()
					print ("WORKER: {} STARTING TASK: {}".format(my_id, task))
					t = Thread(target=execute_thread, args=(worker_queue, task, validate))
					t.start()
					busy = True
				elif action == 'AMIBUSY?':
					q_output.put(busy)
				elif action == 'GET DATA':
					q_output.put(current_data)
					print ('WORKER {} . RECEIVED "GET DATA". SEND DATA {}'.format(my_id, current_data))
					current_data = ''
				else:
					raise Exception('DO NOT KNOW WHAT TO DO WITH ACTION: {}'.format(action))
			else:
				raise Exception('COULD NOT FIND "ACTION" in message')

		if busy:
			# COLLECT OUTPUT!
			if worker_queue.empty():
				print ('WORKER {} . EMPTY OUTPUT QUEUE'.format(my_id))
				pass # DO NOTHING. NO OUTPUT..
			else:
				worker_size = worker_queue.qsize()
				print ('WORKER {} . NOT EMPTY QUEUE. SIZE: {}'.format(my_id, worker_size))
				last_put = False
				for i in range(worker_size):
					line = worker_queue.get()
					if line == 'ARKALOS||FINISHED':
						current_data += line
						last_put = True
					else:
						current_data += 'ARKALOS||OUTPUT||' + line

			
				if last_put:
					busy = False
					t = None
					worker_queue = None

		time.sleep(1)
						
class ArkalosWorkers:
	def __init__(self, num=3):

		self.num = num

		# Communication Queues
		self.q_input = process_Queue()  
		self.q_output = process_Queue() 

		self.p = Process(target=self.main_process, args=(self.q_input, self.q_output))
		self.p.start()


	def start_pool(self):
		#Start the processes
		pool = []
		for i in range(self.num):
			#parent_conn, child_conn = Pipe()
			q_input = process_Queue()
			q_output = process_Queue()
			p = Process(target=process_worker, args=(q_input, q_output, i))
			p.daemon = False

			p.start()
			#p.join()
			pool.append({'p': p, 'q_input': q_input, 'q_output': q_output, 'i': i})

		print ('POOLS STARTED')
		return pool

	def ask_if_idle(self,p):
		p['q_input'].put({'ACTION':'AMIBUSY?'})

		while True:
			if not p['q_output'].empty():
				busy = p['q_output'].get()
				break

			time.sleep(1)

		return not busy # not busy means idle


	def find_one_idle(self, registered, pool):

		for p_index, p in enumerate(pool):
			if registered[p_index]:
				continue

			is_idle = self.ask_if_idle(p)
			if is_idle:
				return p_index

		return None

	def get_output_from_worker(self, p):
		p['q_input'].put({'ACTION':'GET DATA'})

		while True:
			if not p['q_output'].empty():
				ret = p['q_output'].get()
				break

			time.sleep(1)

		if ret:
			print ('COLLECTED OUTPUT FROM WORKER: {} --> {}'.format(p['i'], ret))
		return ret

	def main_process(self, q_input, q_output):

		pool = self.start_pool()
		next_idle = None
		#state = {} # Not used 
		messages = {i:'' for i in range(len(pool))}
		registered = {i:False for i in range(len(pool))} # Nothing is registered

		time.sleep(2)

		try:
			while True:

				#Check if there is an idle worker
				if next_idle is None:
					# Find next idle
					next_idle = self.find_one_idle(registered, pool)
					print ('FOUND NEW NEXT IDLE: {}'.format(next_idle))

				#Get output from registered
				for p_index, p in enumerate(pool):
					if registered[p_index]:
						#print ('111:', messages[p_index])
						data_from_worker = self.get_output_from_worker(p)
						#print ('222:', data_from_worker)
						messages[p_index] += data_from_worker

				#Check input queue for commands 
				if q_input.empty():
					time.sleep(1)
					continue

				# Queue is not empty
				message = q_input.get()
				if message['ACTION'] == 'GET IDLE':
					print ('MAIN PROCESS RECEIVED "GET IDLE"')
					if next_idle is None:
						# We could not find an idle worker
						q_output.put('NONE')
						next_idle_ret = 'NONE'
					else:
						# We found and return an idle worker
						assert not registered[next_idle] # Since it is idle it cannot be registered

						#Register the worker
						registered[next_idle] = True

						# Send it
						q_output.put(str(next_idle))
						next_idle_ret = next_idle

						#Force next loop to find a new next_idle
						next_idle = None

	
						print ('MAIN PROCESS RETURN NEXT IDLE: {}'.format(next_idle_ret))

				elif message['ACTION'] == 'SUBMIT':
						submit_process = int(message['p_index'])
						assert registered[submit_process] # Since we returned it then it is registered

						pool[submit_process]['q_input'].put({
							'ACTION': 'START',
							'TASK': message['TASK'],
							'VALIDATE': message['VALIDATE'],

							})

				elif message['ACTION'] == 'GET OUTPUT':
						submit_process = int(message['p_index'])
						assert registered[submit_process]

						this_messages = messages[submit_process]
						q_output.put(this_messages)
						messages[submit_process] = ''

						if 'ARKALOS||FINISHED' in this_messages:
							registered[submit_process] = False

				elif message['ACTION'] == 'RELEASE':
						submit_process = int(message['p_index'])
						registered[submit_process] = False
				else:
					raise Exception('Unknown Command : {}'.format(message['ACTION']))

				#print ('MAIN PROCESS, END OF CHECK Q_INPUT FOR MESSAGES')
				time.sleep(1)
		except Exception as e:
			print ('Exception in MAIN PROCESS: {}'.format(str(e)))
			traceback.print_exc(file=sys.stdout)


	def get_idle_process(self,):
		self.q_input.put({'ACTION': 'GET IDLE'})

		while True:
			if self.q_output.empty():
				#print ('GET EMPTY REQUEST SENT. STILL EMPTY QUEUE')
				pass # Do nonthing
			else:
				message = self.q_output.get()
				#print ('MAIN PROCESSED RECEIVED: ', message)
				if message == 'NONE':
					idle_process = 'NONE'
				else:
					idle_process = int(message)
				break

			time.sleep(1)

		return idle_process

	def submit(self, idle_process, task, validate):
		self.q_input.put({
			'ACTION': 'SUBMIT', 
			'p_index': idle_process, 
			'TASK': task,
			'VALIDATE': validate,
		})


	def get_output(self, idle_process):
		self.q_input.put({'ACTION': 'GET OUTPUT', 'p_index': idle_process})

		while True:
			if self.q_output.empty():
				pass # Do nothing
			else:
				message = self.q_output.get()
				#print ('MAIN PROCESS RECEIVED: ', message)
				break

			time.sleep(1)

		return message



#def main_process_run_task(q_input, q_output, task):
#	idle_process = main_process_get_idle_process(q_input, q_output)
#	print ('IDLE PROCESS:', idle_process)
#	main_process_submit(q_input, idle_process, task)
#
#	while True:
#		output = main_process_get_output(q_input, q_output, idle_process)
#		print ('IDLE PROCESS: {} OUTPUT: {}'.format(idle_process, output))
#		if 'ARKALOS||FINISHED' in output.split('\n'):
#			break
#
#		time.sleep(1)
#
#	print ('IDLE PROCESS: {} FINISHED '.format(idle_process))


#def test_main_process():
#	q_input = process_Queue()
#	q_output = process_Queue()
#
#	p = Process(target=main_process, args=(q_input, q_output))
#	p.start()
#
#	time.sleep(1)
#	main_process_run_task(q_input, q_output, 'ls -l')

### For testing S class
#class ArkalosWorkers:
#	pass

class S(BaseHTTPRequestHandler):
	'''
	https://gist.github.com/bradmontgomery/2219997
	'''

	workers = ArkalosWorkers()

	def _set_headers(self):
		self.send_response(200)
		self.send_header('Content-type', 'text/html')
		self.send_header('Access-Control-Allow-Origin', '*')
		self.end_headers()

	def do_OPTIONS(self):
		'''
		https://stackoverflow.com/questions/16583827/cors-with-python-basehttpserver-501-unsupported-method-options-in-chrome
		TODO: ALLOW FROM A GIVEN ORIGIN
		'''

		self.send_response(200, "ok")
		self.send_header('Access-Control-Allow-Origin', '*')
		self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS') # GET ??
		#self.send_header("Access-Control-Allow-Headers", "X-Requested-With")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.send_header("Access-Control-Allow-Headers", "x-csrftoken")
		self.send_header("Access-Control-Allow-Headers", "access-control-allow-origin")
		self.end_headers()

	def do_POST(self):
		'''
		TODO: check origin
		r = requests.post("http://127.0.0.1:8080", data=json.dumps({'action': 'GET EMPTY'}))0
		r.json()['p_index']


		'''

		#Check origin
		host = self.headers.get('Host')
		print ('### HOST:', host)

		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		print (post_data)

		try:
			data = json.loads(post_data)
		except Exception as e:
			print ('Could not parse JSON DATA..')
		
		if not 'action' in data:
			raise Exception('Unknown JSON DATA')

		action = data['action']
		if action == 'GET IDLE':
			print ('HTTP RECEIVED ACTION GET IDLE')
			idle_process = self.workers.get_idle_process()
			print ('HTTP GOT IDLE PROCESS: {}'.format(idle_process))
			ret_data = {
				'success': True,
				'p_index': idle_process
			}
		elif action == 'SUBMIT':
			task = data['task']
			validate = data['validate']
			p_index = data['p_index']
			self.workers.submit(p_index, task, validate)
			ret_data = {
				'success': True,
				'p_index': p_index, 
				'response': 'SUBMITTED'
			}
		elif action == 'GET OUTPUT':
			p_index = data['p_index']
			message = self.workers.get_output(p_index)

			message = message.replace('ARKALOS||OUTPUT||', '')`
			last = 'ARKALOS||FINISHED' in message
			message = message.replace('ARKALOS||FINISHED', '')

			if 'ARKALOS VALIDATION FAILED' in message:
				validated = 1
			elif 'ARKALOS VALIDATION SUCCEEDED' in message:
				validated = 2
			else:
				validated = 0

			ret_data = {
				'success': True,
				'p_index': p_index, 
				'output': message,
				'last': last,
				'validated': validated,
			}

		else:
			raise Exception('Unknown action: {}'.format(action))

		ret_bytes = str.encode(json.dumps(ret_data))

		self._set_headers()
		self.wfile.write(ret_bytes)

def run(server_class=HTTPServer, handler_class=S, port=8080):
	server_address = ('', port)
	httpd = server_class(server_address, handler_class)
	print ('Starting httpd : http://127.0.0.1:{}'.format(port))
	httpd.serve_forever()

if __name__ == '__main__':
	run()

	#start_pool()

#	for i in execute('ls -l'):
#		print ('Recieved: {}'.format(i))

#	test_main_process()
#	a = ArkalosWorkers()
#	i = a.get_idle_process()
#	print ('#### ', i)


#	for l in execute2('python /Users/alexandroskanterakis/github/arkalos/test_2.py 20 p1'):
#		print (l)
#
#	pass
