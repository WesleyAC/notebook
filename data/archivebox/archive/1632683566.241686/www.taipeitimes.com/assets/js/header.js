if ( /Android|webOS|iPhone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    $(window).load(function () {
        if ($('.logobar').length) {
            // var video=$("#video_background")[0];
            var scrollTrigger = 60,
                backToTop = function () {
                    var scrollTop = $(window).scrollTop();
                    if (scrollTop > scrollTrigger) {
                        $('.logobar').addClass('logobars');
                        //  $('.micon').addClass('micons');
                        //  $('.menu').addClass('menus');
                        //  $('.meun_bg').addClass('meun_bgs');
                        //  $('.slogo').hide();
                        //  $('.slogos').fadeIn();
                        //  $('.todaybox').fadeIn();

                    } else {
                        $('.logobar').removeClass('logobars');
                        //  $('.micon').removeClass('micons');
                        //  $('.menu').removeClass('menus');
                        //  $('.meun_bg').removeClass('meun_bgs');
                        //   $('.slogo').fadeIn();
                        //   $('.slogos').hide();
                        //   $('.todaybox').hide();
                    }
                };
            backToTop();
            $(window).on('scroll', function () {
                backToTop();
            });

        }
    });

}

$(function(){
    $('#mopen').on('click', function () {
        $('#mopen').hide();
        $('#mclose').show();
        $('.meun_bg').fadeIn();
        $('.nav').show();
        $('.menu').show();
        $('.menu').addClass("navopen");
        $('.closese').hide();
        $('.opense').show();
        $('.search').hide();
        focusOnTextInput($('.news'));
        $("body").addClass("overmybody");
    });

    $('#mclose').on('click', function () {
        $('#mclose').hide();
        $('#mopen').show();
        $('.meun_bg').fadeOut();
        $('.menu').removeClass("navopen");
        $('.closese').hide();
        $('.opense').show();
        $("body").removeClass("overmybody");
        if ($('.news').val() == '') {
            $('.news').removeClass("newsin");

        };
    });

    $('.msbg').on('click', function () {
        $('#mclose').hide();
        $('#mopen').show();
        $('.meun_bg').fadeOut();
        $('.menu').removeClass("navopen");
        $('.closese').hide();
        $('.opense').show();
        $("body").removeClass("overmybody");
    });

    $('#reportrange').on('click', function () {
        $("body").removeClass("overmybody");
    });

    if ( /Android|webOS|iPhone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        $('.opense').click(function () {
            $('.nav').hide();
        })
    }
    $('.opense').on('click', function () {
        $('.opense').hide();
        $('.closese').show();
        $('.search').slideDown();
        focusOnTextInput($('.news'));
    });

    $('.closese').on('click', function () {
        $('.closese').hide();
        $('.opense').show();
        $('.search').slideUp();
    });

    $('.news').on('click', function () {
        $('.news').addClass("newsin");
    });
    $('.closese').on('click', function () {
        if ($('.news').val() == '') {
            $('.news').removeClass("newsin");

        };
    });

    function focusOnTextInput(tar)
    {
        if (tar.val() != '') {
            var newsValue = tar.val();
            tar.val('').val(newsValue);
            tar.focus();
        }
    }
});
