var gpsTrace = function() {
   // GL版命名空间为BMapGL
    // 按住鼠标右键，修改倾斜角和角度
    var bmap = new BMapGL.Map("allmap");    // 创建Map实例
    bmap.enableScrollWheelZoom(true);     // 开启鼠标滚轮缩放
    var gps_point = [];
    var gps_time  = [];
    var gps_speed = [];
    var baidu_point = [];

    const ws = new WebSocket("ws://"+location.host);

    ws.onopen = function() {
        sendMessage = function(msg) {
            ws.send(JSON.stringify(msg));
        };
        
        sendMessage({type:'yearList'});

        ws.onmessage = function(data) {
            // console.log(data);
            msg = JSON.parse(data.data);
            // console.log(msg);
            switch(msg.type) {
                case 'yearList':
                    let yearElement = document.getElementById('yearSelector');
                    msg.data.forEach(y => {
                        yearElement.innerHTML += "<option value='"+y+"'>"+y+"</option>";
                    });
                    yearElement.value = msg.data[msg.data.length-1];
                    sendMessage({type:'dayList',year:yearElement.value});
                    break;
                case 'dayList':
                    let dayElement = document.getElementById('dayList');
                    dayElement.innerHTML = "<ul>";
                    msg.data.forEach(d => {
                        dayElement.innerHTML += "<li onclick='selectDay(this);'>"+d+"</li>";
                    });
                    dayElement.innerHTML += "</ul>";
                    break;
                case 'gpsList':
                    onLogData(msg.data);
                    break;
                default:
                    break;
            }
        };

        selectDay = function(d) {
            let y = document.getElementById('yearSelector').value;
            sendMessage({type:'gpsList', year:y, day:d.innerText});
            let dayList = document.getElementById('dayList').getElementsByTagName('li');
            for(i=0;i<dayList.length;i++) {
                dayList[i].style.backgroundColor = "";
            }
            d.style.backgroundColor = "#888888";
        };

        yearChanged = function(e) {
            let yearElement = document.getElementById('yearSelector');
            sendMessage({type:'dayList',year:yearElement.value});
        };
    };

    onLogData = function(log) {
        bmap.clearOverlays();
        baidu_point = [];
        gps_point = [];
        gps_time = [];
        gps_speed = [];
        traceList = log.split('\n');
        if(traceList.length > 0) {
            traceList.forEach(trace => {
                // console.log(trace.trim());
                lonlat = trace.trim().split(',');
                if(lonlat.length == 4 )
                    gps_point.push(new BMapGL.Point(parseFloat(lonlat[2]), parseFloat(lonlat[1])));
                    gps_time.push(lonlat[0]);
                    gps_speed.push(lonlat[3]);
            });
            // console.log(gps_point.length);
            $( "#loading" ).show();
            lonlat2baidu(gps_point);
        }
    };

    translateCallback = function (data){
        if(data.status === 0) {
            data.points.forEach(p => {
                baidu_point.push(p);
            });
            // drawRoute();
        }
        if(gps_point.length > 0) {
            // setTimeout(lonlat2baidu(gps_point), 100);
            lonlat2baidu(gps_point);
        }else{
            drawRoute();
        }
    };

    lonlat2baidu = function(gpsList) {
        var convertor = new BMapGL.Convertor();
        convertor.translate([gpsList.shift()], COORDINATES_WGS84, COORDINATES_BD09, translateCallback);
    };
    
    drawRoute = function() {
        // console.log(baidu_point);
        // bmap.addOverlay(new BMapGL.Polyline(baidu_point));
        // bmap.setViewport(baidu_point);
        for(i=0;i<baidu_point.length;i++) {
            var markergg = new BMapGL.Marker(baidu_point[i]);
            // let labelgg = new BMapGL.Label(gps_time[i]+'<br>'+gps_speed[i]);
            // labelgg.setStyle({visibility: "hidden"});
            // markergg.addEventListener('mouseover',showLabel);
            // markergg.addEventListener('mouseout',hideLabel);
            // markergg.setLabel(labelgg);
            markergg.setTitle(gps_time[i]+'\n'+gps_speed[i]);
            bmap.addOverlay(markergg);
        }
        bmap.setViewport(baidu_point);
        $( "#loading" ).hide();
    };

    // showLabel = function(e) {
    //     e.target.getLabel().setStyle({visibility: "visible"});
    // };

    // hideLabel = function(e) {
    //     e.target.getLabel().setStyle({visibility: "hidden"});
    // };
};