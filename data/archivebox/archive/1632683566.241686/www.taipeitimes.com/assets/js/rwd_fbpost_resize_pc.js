// 文中表格調整
// 配合css中 .xscroll: overflow-x:scroll
function rwd_fbpost_resize_pc(parent) {
    if ($(parent + ' iframe').length > 0) {
        $(parent + ' iframe').each(function () {
            var check_src = $(this).attr('src');
            if (typeof(check_src) != "undefined") {
                if (check_src.includes('facebook')) {
                    var content_width = $(parent).width(); // 文寬
                    var fb_post_width = $(this).attr('width'); // fb-post寬
                    if (fb_post_width > content_width) {
                        if (!$(this).parent('div').hasClass('xscroll')) {
                            $(this).wrap('<div class="xscroll"></div>');
                        }
                    }
                }
            }
        });
    }
}
