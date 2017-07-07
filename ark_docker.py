
import uuid

base_images = {
"Ubuntu_14_04" : "ubuntu:14.04",
}

# The command '/bin/sh -c cd /root; chmod +x commands.sh ; /bin/bash commands.sh' returned a non-zero code: 127 

default_commands = '''

mkdir {rnd_id}
cd {rnd_id}

cat > commands.sh << EOF
{commands}
EOF

cat > Dockerfile << EOF
FROM {base}

RUN apt-get update --fix-missing && apt-get install -y git \
    gcc g++ make \
    wget curl \
    zip bzip2

ADD commands.sh /root

RUN cd /root; chmod +x commands.sh ; /bin/bash commands.sh

ENTRYPOINT [ "/bin/bash" ]

EOF

docker build -t {rnd_id} .

cd ../

'''

def random_id():
	return 'd__' + str(uuid.uuid4()).split('-')[-1]

def build_image_script(commands, base='Ubuntu_14_04'):
	rnd_id = random_id()

	parameters = {
		'rnd_id': rnd_id,
		'commands': commands,
		'base': base_images[base],
	}

	script = default_commands.format(**parameters)
	script_filename = '{}.sh'.format(rnd_id)

	with open(script_filename, 'w') as f:
		f.write(script)

	script_command = 'bash {}'.format(script_filename)
	return script_command

if __name__ == '__main__':
	build_image('')


