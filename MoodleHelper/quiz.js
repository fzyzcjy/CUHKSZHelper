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
        var createCheckAllAboveBtn = (toCheckCnt, customText) => {
            var text = customText || 'Check All Above';
            var checkAllAboveText =
                (toCheckCnt>=RECOMMENT_CHECK_CNT?'[RECOMMEND] ':'') +
                text + '(' + toCheckCnt+' Questions)';
            return $('<input ' + 
                    'class="mh-check-all-above" ' + 
                    'value="'+checkAllAboveText+'" ' + 
                    'type="button" ' + 
                    (toCheckCnt>=RECOMMENT_CHECK_CNT?'style="font-weight: bold; color: rgba(111, 19, 106, 0.9)"':'') +
                '/>');
        }

        var renderCurQue = (disableScrollTo) => {
            var $que = curQue.getCurQueEl();

            $(".mh-que-active").removeClass("mh-que-active");
            $que.addClass("mh-que-active");

            $(".mh-check-all-above").remove();
            $que.find('.im-controls').append(createCheckAllAboveBtn(getAvailableCheckElArr().length));

            if(!disableScrollTo) {
                $('html, body')
                    .stop()
                    .animate({
                        scrollTop: $que.offset().top
                    }, 200);
            };

            // about `Next page`
            var $nextBtn = $("input[name=next]"); // next or *finish attempt*
            // var $prevBtn = $("input[name=previous]");
            $nextBtn.parent().append(createCheckAllAboveBtn(getAvailableCheckElArr(true).length, 'Check All Page').addClass('mod_quiz-next-nav'));
        }

        var getQueEl = (queIdx) => {
            queIdx = queIdx==undefined ? QuizStorage.get('curQueIdx') : queIdx;
            return $("#q" + queIdx);
        }

        var autoSetIdx = (newQueIdx) => {
            if(getQueEl(newQueIdx).length > 0) {
                QuizStorage.save('curQueIdx', newQueIdx);
            }
            renderCurQue();
        }

        var move = (step) => {
            var newQueIdx = QuizStorage.get('curQueIdx') + step;
            autoSetIdx(newQueIdx);
        }

        var init = () => {
            renderCurQue(true);
        }

        return {
            next() {
                move(1);
            },
            getCurQueEl() {
                if(getQueEl().length == 0) {
                    var firstQueInPage = getIdFromQue($(".que:first-child"));
                    autoSetIdx(firstQueInPage);
                }
                return getQueEl(); // get it again
            },
            move: move,
            init: init,
        }
    })();

    function onAnsClick(ansIdx) {
        var $que = curQue.getCurQueEl();
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

    function getAvailableCheckElArr(noNeedAboveCur) {
        return $("input.submit.btn[value=Check]").filter((idx, el) => {
            var $que = $(el).parents('.que');
            var isAbove = (getIdFromQue($que) <= getIdFromQue(curQue.getCurQueEl()));
            var isAnswered = ($que.find('.answer input[type=radio]:checked').length > 0);
            return (noNeedAboveCur || isAbove) && isAnswered;
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
        $("body").on('click', '.mh-check-all-above', onCheckAllAbove);
        curQue.init();

        $.get(getURL('quiz.template.html'), function(data) {
            $(data).prependTo('#region-main div[role=main] form>div');
            onInjectedDOMReady();
        });
    }

    $(bootQuiz);
})();