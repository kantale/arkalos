
import uuid

# https://hub.docker.com/_/ubuntu/ 
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

cat > validate.sh << EOF
{validate}
EOF

cat > runvalidate.sh << EOF

bash validate.sh
if [ \$? -eq 0 ] ; then
    echo "ARKALOS VALIDATION SUCCEEDED"
    exit 0
fi
echo "ARKALOS VALIDATION FAILED"
exit 1

EOF

cat > Dockerfile << EOF
FROM {base}

RUN apt-get update --fix-missing && apt-get install -y git \
    gcc g++ make \
    wget curl \
    zip bzip2

ADD commands.sh validate.sh runvalidate.sh /root/

RUN cd /root; chmod +x commands.sh ; /bin/bash commands.sh ; /bin/bash runvalidate.sh

ENTRYPOINT [ "/bin/bash" ]

EOF

docker build -t {rnd_id} .

cd ../

'''

def random_id():
	return 'd__' + str(uuid.uuid4()).split('-')[-1]

def build_image_script(commands, validate, base='Ubuntu_14_04'):
	rnd_id = random_id()

	parameters = {
		'rnd_id': rnd_id,
		'commands': commands,
		'validate': validate,
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


