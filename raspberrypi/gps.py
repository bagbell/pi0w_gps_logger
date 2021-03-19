import io
import datetime
import pynmea2
import serial
import glob
import os
import socket
import math
from decimal import Decimal
from geopy import distance
import requests

def sendCmd2DashCam(str):
    url = "http://192.168.1.254/?custom=1"
    # print(url+str)
    try:
        response = requests.get(url+str, timeout=2)
        if response.status_code == 200:
            return True
    except requests.exceptions.Timeout:
        pass
    return False

def setDashCamDateTime(d):
    get_request = "&cmd=3005&str="+str(d.year)+"-"+str(d.month)+"-"+str(d.day)
    if not sendCmd2DashCam(get_request):
        return False

    get_request = "&cmd=3006&str="+str(d.hour)+":"+str(d.minute)+":"+str(d.second)
    if not sendCmd2DashCam(get_request):
        return False
    
    return True
    
def getDistance(gps1, gps2):
    location1 = (gps1.latitude, gps1.longitude)
    location2 = (gps2.latitude, gps2.longitude)
    return distance.distance(location1, location2).km

def getGPSInfo(gps, logPath, updateDashCam):
    logFolderExist = False
    lastLocation = None
    while 1:
        try:
            line = gps.readline()
            if line.startswith('$GPRMC'):
                msg = pynmea2.parse(line)
                if msg.status == "A":
                    dDays = msg.datestamp - datetime.date(1999, 8, 21)
                    d = datetime.date(2019, 4, 6) + datetime.timedelta(days=dDays.days)
                    t = msg.timestamp
                    date = datetime.datetime(year=d.year,month=d.month,day=d.day, hour=t.hour, minute=t.minute, second=t.second) 
                    date = date + datetime.timedelta(hours=8)
                
                    if updateDashCam:
                        updateDashCam = not setDashCamDateTime(date)
                    
                    if logFolderExist is False:
                        try:
                            os.makedirs(logPath+str(date.year))    
                        except FileExistsError:
                            pass
                        logFolderExist = True
                    
                    if lastLocation is None:
                        lastLocation = msg
                    
                    dist = getDistance(msg, lastLocation) * 1000
                    # print(dist)
                    speed = msg.spd_over_grnd * 1.852
                    needWrite2File = False
                    if (speed <= 30 and dist > 25) or (speed > 30 and speed < 60 and dist > 150) or (dist > 300):
                        needWrite2File = True

                    if needWrite2File:
                        logFile = open(logPath+str(date.year)+"/"+date.strftime("%Y-%m-%d")+".log",'a')
                        logFile.write(date.strftime("%Y-%m-%d %H:%M:%S")+","+str(msg.latitude)+","+str(msg.longitude)+","+str(speed)+"\n")
                        logFile.close()
                        lastLocation = msg
                #print(msg.lat, msg.lat_dir, msg.lon, msg.lon_dir, msg.spd_over_grnd, date, msg.status)
                #print(repr(msg))
        except serial.SerialException as e:
            print('Device error: {}'.format(e))
            break
        except pynmea2.ParseError as e:
            print('Parse error: {}'.format(e))
            continue

def getIP():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def listFileOrFolder(path, isFile):
    dirFiles = os.listdir(path)
    fullpaths= map(lambda name: os.path.join(path, name), dirFiles)
    retList = []
    for file in fullpaths:
        if isFile is True:
            if os.path.isfile(file): 
                retList.append(file)
        else:
            if os.path.isdir(file): 
                retList.append(file)
    return retList

def getLastRecordDatetime(logPath):
    dirs = listFileOrFolder(logPath, False)
    if len(dirs) > 0:
        yearDir = max(dirs)
        files =listFileOrFolder(yearDir, True)
        if len(files) > 0:
            with open(max(files), 'rb') as f:
                f.seek(-2, os.SEEK_END)
                while f.read(1) != b'\n':
                    f.seek(-2, os.SEEK_CUR)
                last_line = f.readline().decode()
                data = last_line.split(",")
                return datetime.datetime.strptime(data[0], "%Y-%m-%d %H:%M:%S")

    return None

if __name__ == '__main__':
    logPath = "/home/bao/log/"
    # logPath = "/mnt/d/raspberrypi/gps/carTrace/log"
    updateDashCam = False
    if(getIP().startswith("192.168.1.")):
        dt = getLastRecordDatetime(logPath) + datetime.timedelta(minutes=3)
        setDashCamDateTime(dt)
        updateDashCam = True
    
    uart = serial.Serial('/dev/serial0', 38400, timeout=5.0)
    uart_io = io.TextIOWrapper(io.BufferedRWPair(uart, uart))

    getGPSInfo(uart_io, logPath, updateDashCam)