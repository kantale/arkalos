# Arkalos
An open science collaborative system

### Create working envrironment
Create a virtual conda environment
```bash
anaconda3/bin/conda create --name arkalos django  
```

OR
```
~/anaconda3/bin/virtualenv arkalos_python 
```



Enter the environment with
```bash
source anaconda3/bin/activate arkalos

OR

source arkalos_python/bin/activate
```

Install prerequisites:
```bash
conda install -y simplejson 
pip install pybtex
```

OR

```
pip install simplejson
pip install pybtex
pip install Django==1.10.5
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

Rebuild DB:
```
python manage.py migrate --run-syncdb 
```

