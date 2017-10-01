(function(){
    const ANS_KEY_ARR = ['1','2','3','4','5'];
    const POS_CONTROL_KEY_ARR = ['<','>'];
    const RECOMMENT_CHECK_CNT = 10;

    var QuizStorage = (() => {
        const DEFAULT_OBJ = {
            curQueIdx: 1,
            checkingAllAbove: false,
        };
        var quizAttemptId = $_GET['attempt'];
        var getObj = () => {
            var raw = StorageHelper.get('quiz', quizAttemptId);
            return (raw.length == 0) ? DEFAULT_OBJ : raw;
        };
        return {
            get(objKey) {
                return getObj()[objKey];
            },
            save(objKey, val) {
                var obj = getObj();
                obj[objKey] = val;
                StorageHelper.save('quiz', quizAttemptId, obj);
            }
        };
    })();

    var curQue = (() => {
        var renderCurQue = (disableScrollTo) => {
            var $que = curQue.getQueEl();

            $(".mh-que-active").removeClass("mh-que-active");
            $que.addClass("mh-que-active");

            var toCheckCnt = getAvailableCheckElArr().length;
            var checkAllAboveText =
                (toCheckCnt>=RECOMMENT_CHECK_CNT?'[RECOMMEND] ':'') +
                'Check All Above (' + toCheckCnt+' Questions)';
            $("#mh-check-all-above").remove();
            $que.find('.im-controls').append(
                '<input ' + 
                    'id="mh-check-all-above" ' + 
                    'value="'+checkAllAboveText+'" ' + 
                    'type="button" ' + 
                    (toCheckCnt>=RECOMMENT_CHECK_CNT?'style="font-weight: bold; color: rgba(111, 19, 106, 0.9)"':'') +
                '/>');

            if(!disableScrollTo) {
                $('html, body')
                    .stop()
                    .animate({
                        scrollTop: $que.offset().top
                    }, 200);
            };

            // about `Next page`
            // var $nextPageBtn = $("input[name=next][value='Next page']");
            // var $prevPageBtn = $("input[name=previous][value='Previous page']");
            // console.log($nextPageBtn, $prevPageBtn);

        }

        var getQueEl = (queIdx) => {
            queIdx = queIdx==undefined ? QuizStorage.get('curQueIdx') : queIdx;
            return $("#q" + queIdx);
        }

        var move = (step) => {
            var newQueIdx = QuizStorage.get('curQueIdx') + step;
            if(getQueEl(newQueIdx).length > 0) {
                QuizStorage.save('curQueIdx', newQueIdx);
            }
            renderCurQue();
        }

        var init = () => {
            renderCurQue(true);
        }

        return {
            next() {
                move(1);
            },
            move: move,
            getQueEl: getQueEl,
            init: init,
        }
    })();

    function onAnsClick(ansIdx) {
        var $que = curQue.getQueEl();
        var $ans = $que.find('input[type=radio][id$=answer'+ansIdx+']');
        $ans.click();
        curQue.next();
    }

    function onPosControlClick(deltaPos) {
        curQue.move(deltaPos);
    }

    function getIdFromQue($que) {
        return parseInt($que.attr('id').substr(1))
    }

    var keyMapping = (() => {
        var mapping = {};
        for (var i = 0; i < ANS_KEY_ARR.length; ++i) {
            mapping[ANS_KEY_ARR[i]] = (function (idx) {
                return () => onAnsClick(idx);
            })(i);
        }
        mapping[POS_CONTROL_KEY_ARR[0]] = () => onPosControlClick(-1);
        mapping[POS_CONTROL_KEY_ARR[1]] = () => onPosControlClick(1);
        return mapping;
    })();

    function onKeyDown(e) {
        var runner = keyMapping[e.key];
        if (runner == undefined) return;
        runner();
    }

    function autoContiCheckAllAbove() {
        if(QuizStorage.get('checkingAllAbove') === true) {
            onCheckAllAbove();
        }
    }

    function getAvailableCheckElArr() {
        return $("input.submit.btn[value=Check]").filter((idx, el) => {
            var $que = $(el).parents('.que');
            var isAbove = (getIdFromQue($que) <= getIdFromQue(curQue.getQueEl()));
            var isAnswered = ($que.find('.answer input[type=radio]:checked').length > 0);
            return isAbove && isAnswered;
        });

    }

    function onCheckAllAbove() {
        console.log("Check All Above");
        QuizStorage.save('checkingAllAbove', true);
        var $needClickCheckArr = getAvailableCheckElArr();
        $("#mh-hint-checking").show();
        if($needClickCheckArr.length > 0) {
            $("#mh-hint-checking-remain").text($needClickCheckArr.length);
            setTimeout(() => {
                $($needClickCheckArr[0]).click();
            }, 50);
        } else {
            setTimeout(() => {
                $("#mh-hint-checking").hide();
            }, 1000);
            $("#mh-hint-checking-remain").text('ALL END!');
            QuizStorage.save('checkingAllAbove', false);
        }
    }

    function onInjectedDOMReady() {
        // put it here, because it refreshes the hint div, which is loaded by the template html
        autoContiCheckAllAbove();
    }

    function bootQuiz() {
        if(location.href.indexOf('quiz') == -1 || location.href.indexOf('attempt') == -1) {
            return;
        }

        $("body").keydown(onKeyDown);
        $("body").on('click', '#mh-check-all-above', onCheckAllAbove);
        curQue.init();

        $.get(chrome.extension.getURL('/quiz.template.html'), function(data) {
            $(data).prependTo('#region-main div[role=main] form>div');
            onInjectedDOMReady();
        });
    }

    $(bootQuiz);
})();