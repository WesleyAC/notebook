var pv_js_ver = 202002121;
var pvServer = 'www.taipeitimes.com';
var cookieDomain = location.host;

function getScrNews(channel, type, group, no)
{
	getScrNews2(channel, type, group, no, "");
}

function getScrNews2(channel, type, group, no, abtest)
{
	
    var a = window.screen.width,
        b = window.screen.height,
        c = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth),
        d = (window.innerHeight || document.documentElement.clientHeight|| document.body.clientHeight),
        e = get_referrer(),
        f = encodeURIComponent(document.URL),
        g = encodeURIComponent(document.title),
        h = channel,
        i = type,
        j = (group == 'undefined') ? '' : group,
        k = (no == 'undefined') ? '' : no,
        l = navigator.cookieEnabled,
        m=(ad_block_check) ? 'A' : 'B',
		n=abtest,
		o=get_session_id();
		
	var tt_guid=ltncookies("tt_guid"),
		ltn_device=ltncookies("ltn_device"),
		ltn_page=ltncookies("ltn_page"),
		ltn_area=ltncookies("ltn_area"),
		ltn_item=ltncookies("ltn_item"),
		ltn_elem=ltncookies("ltn_elem");
	
	
    var tt = (new Date()).getTime();
	
	var arge = "a="+a+"&b="+b+
            "&c="+c+"&d="+d+"&e="+e+"&f="+f+"&g="+g+"&h="+h+"&i="+i+"&j="+j+"&k="+k+"&l="+l+"&m="+m+"&n="+n+'&o='+o+'&tt='+tt+'&jsv='+pv_js_ver;
	
	arge+='&tt_guid='+tt_guid;
	arge+='&ltn_device='+ltn_device;
	arge+='&ltn_page='+ltn_page;
	arge+='&ltn_area='+ltn_area;
	arge+='&ltn_item='+ltn_item;
	arge+='&ltn_elem='+ltn_elem;
	
	var pv1url = '//'+pvServer+"/log/tt?"+arge;
	//var pv3url = "https://pv.ltn.com.tw/tt?"+arge;
	
	loadScript(pv1url, function(){
		//loadScript(pv3url, function(){});
		var ov_sec = -100;
		ltncookies("ltn_device", "", ov_sec);
		ltncookies("ltn_page", "", ov_sec);
		ltncookies("ltn_area", "", ov_sec);
		ltncookies("ltn_item", "", ov_sec);
		ltncookies("ltn_elem", "", ov_sec);
	});

    function get_referrer(){
        var ref = ltncookies("ltn_referrer");
        ltncookies("ltn_referrer", "", -100);
        if(ref==""){ ref = encodeURIComponent(document.referrer); }
        if(ref==""){ return ""; }
        return ref;
    }
	
	function loadScript(url, fnload){
		var s = document.createElement("script");
		s.async = true;
		s.src = url;
		s.onload = function(){
			fnload();
		};
		var el = document.getElementsByTagName("script")[0];
		el.parentNode.insertBefore(s, el);	
	}

}

function get_session_id()
{
	var timeout = 30 * 60 * 1000;
	var tt = (new Date()).getTime();
	var overtime = tt - timeout;
	var session = ltncookies("ltnSession");
	var session_last = ltncookies("ltnSessionLast");
	var type = 0;
	if(session==""){
		type = 1; //空值
	}else if(session_last==""){
		type = 1; //空值
	}else if(overtime>session_last){
		type = 1; //工作逾時
	}else{
		type = 2; //延長時間
	}
	
	ltncookies("ltnSessionLast", tt, timeout);
	
	if(type==1){
		ltncookies("ltnSession", tt, 24*60*60);
		return tt;
	}
	
	return session;
	
}

// 將數值存入 cookie
function ltncookies(key, value, time_sec){
    if (arguments.length > 1) {
        var cv  = encode(key)+'='+encode(value);
            cv += ';domain='+cookieDomain;
            cv += ';path=/';

        if(time_sec){
            var s = new Date();
            var e = new Date((s.getTime()+time_sec*1000));
            cv += ';expires='+e.toUTCString();
        }
        document.cookie = cv;
    }else{
        var _key    = encode(''||key);		
		var arr = document.cookie.match(new RegExp("(^| )"+_key+"=([^;]*)(;|$)"));		
		if(arr != null) return arr[2];
		
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        var res     = '';
		
        for (var i  = 0, l = cookies.length; i < l; i++) {

            var parts  = cookies[i].split('=');
            var name   = parts.shift();
            var cookie = parts.join('=');
            if (_key === name) {
                res = cookie;
                break;
            }
        }

        return res;
    }

    function encode(s) {
        return encodeURIComponent(s);
    }

    function decode(s) {
        return decodeURIComponent(s);
    }
};

var ad_block_check = true;
(function(){

    var s = document.createElement("script")
    var el = document.getElementsByTagName("script")[0];
    s.src = "//"+pvServer+"/log/google_ad_block_check.js?_t=" + Math.floor((new Date).getTime() / 300000);
    el.parentNode.insertBefore(s, el);

})();
