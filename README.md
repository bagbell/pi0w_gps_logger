Raspberry Pi Zero W GPS Logger
====

Since the Dash Camera from my car dealer has no battery in side and not get constant power from fuse box. The camera lost date and time every time when car is off. This makes recorded video almost useless. 

Lucky in unlucky, the dash camera is Novatek NT9666x like camera. It has web api can update date and time like this:
> http://192.168.1.254/?custom=1&cmd=3005&str=2021-03-19
> http://192.168.1.254/?custom=1&cmd=3006&str=16:00:00

A old holux m-1000 gps is used to get correct date and time. Pi Zero W reads gps NMEA0183 data through uart. 

The python script **gps.py** is used to do above job, and record gps information in log folder.

The carTrace_web_server is a node.js web server to draw gps information on BAIDU Map. To make it work, BAIDU Map develop SK is required and should in index.html.

##### KNOW ISSUE:

The gps module has no constant power either, for security reason, this makes the module need long time to fix gps satellite location, about 5 minutes, so Pi Zero W reads time from last gps record in log file and add 3 minutes before send it to dash camera.

Other issue is the old log files will not be automatic deleted. With reasonable large capacity micro-SD card this should not be a big problem.