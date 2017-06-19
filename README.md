# Arkalos
An open science collaborative system

### Create working envrironment
Create a cirtual conda environment
```bash
anaconda3/bin/conda create --name arkalos django  
```
Enter the environment with
```bash
source anaconda3/bin/activate arkalos
```

Install prerequisites:
```bash
conda install -y simplejson 
```

The current django version of Arkalos is:
```bash
$  python -m django --version
1.10.5
```

Create arkalos project:
```bash
django-admin startproject arkalos 
```
Create main app:
```
cd arkalos
python manage.py startapp app
```
