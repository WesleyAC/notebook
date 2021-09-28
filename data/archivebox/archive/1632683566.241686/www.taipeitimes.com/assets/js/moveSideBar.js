$(function(){
    move_sidebar_space();
});

// 右側下方留白太多, 需移動右側區塊去填滿
function move_sidebar_space() {

    var obj1129 = $('.contentAll');

    var s2a = {
        'height': function(){
            var h = $('div.contentRight').height();
            if(obj1129.length==1){
                h += obj1129.height();
            }
            return h;
        },
        'offset': function(){
            if(obj1129.length==1){
                return obj1129.offset();
            }else{
                return $('div.contentRight').offset();
            }
        }
    };
    var s1 = new scorllobj("li#left_blake", "div#right_blake");
    // var s2 = new scorllobj(s2a, "#door");
    //var s2 = new scorllobj(".content", "#door");

    $(window).on('scroll.sidebar', function () {
        var winScroll = $(window).scrollTop(),
            windowsH = $(window).height();
        if ($(window).innerWidth(true)[0].innerWidth > 760) {
            s1.run(winScroll, windowsH);
            // s2.run(winScroll, windowsH);
        } else {
            $('div#right_blake').attr("style", "position:relative; bottom:auto;")
        }
    });

    function scorllobj(obj_left, obj_right) {

        var obj = {
            left: (typeof(obj_left)=='string') ? $(obj_left) : obj_left,
            right: $(obj_right)
        };

        var actType = '';

        this.run = function (winScroll, windowsH) {
            var containerH = obj.left.height(),
                primaryH = obj.left.height(),
                sidebarH = obj.right.height(),
                beginPos = obj.left.offset().top;

            if (sidebarH > primaryH) { return; }
            var runType = 'C';
            var pH = sidebarH + beginPos;
            if (pH > windowsH) {
                runType = 'A';
            } else if (pH < windowsH) {
                runType = 'B';
            }

            if (runType == 'A') {
                if (winScroll + windowsH > sidebarH + beginPos && winScroll + windowsH < primaryH + beginPos) {
                    if (actType == 'A1') { return; }
                    var fix = winScroll + windowsH - (beginPos + sidebarH);
                    obj.right.attr("style", "position:fixed; bottom:0px;");
                    actType = 'A1';
                }
                if (winScroll + windowsH > sidebarH + beginPos && winScroll + windowsH >= primaryH + beginPos) {
                    if (actType == 'A2') { return; }
                    var fix = primaryH - sidebarH;
                    obj.right.attr("style", "position:relative; top:" + fix + "px;")
                    actType = 'A2';
                }
                if (winScroll + windowsH < sidebarH + beginPos) {
                    if (actType == 'A3') { return; }
                    obj.right.attr("style", "position:relative; bottom:auto;")
                    actType = 'A3';
                }
            }

            if (runType == 'B') {
                if (winScroll > beginPos && winScroll + sidebarH < beginPos + primaryH) {
                    if (actType == 'B1') { return; }
                    var fix = winScroll - beginPos;
                    obj.right.attr("style", "position:fixed; bottom:0px;");
                    actType = 'B1';
                }
                if (winScroll > beginPos && winScroll + sidebarH >= beginPos + primaryH) {
                    if (actType == 'B2') { return; }
                    var fix = primaryH - sidebarH;
                    obj.right.attr("style", "position:relative; top:" + fix + "px;")
                    actType = 'B2';
                }
                if (winScroll <= beginPos) {
                    if (actType == 'B3') { return; }
                    obj.right.attr("style", "position:relative; bottom:auto;")
                    actType = 'B3';
                }
            }
        }
    }
}
