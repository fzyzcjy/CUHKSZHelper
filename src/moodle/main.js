
// Spider

var Spider = (function(){

    var WaitList = (function(){
        const KEY = 'waitListData';
        const EMPTY_OBJ = {data: [], curIdx: 0};
        var get = function() {
            try {
                return JSON.parse(localStorage[KEY]);
            } catch(e) {
                return EMPTY_OBJ;
            }
        };
        var set = function(data) {
            localStorage[KEY] = JSON.stringify(data);
        };
        return {
            enqueueArr(arr) {
                var obj = get();
                obj.data = obj.data.concat(arr).unique();
                set(obj);
                log("enqueue", obj);
            },
            dequeue() {
                var obj = get();
                var result = obj.data[obj.curIdx];
                obj.curIdx = Math.min(obj.curIdx+1, obj.data.length);
                set(obj);
                return result;
            },
            getObj() {
                return get();
            },
            clear() {
                set(EMPTY_OBJ);
            }
        }
    })();

    const IS_RUNNING_KEY = 'isSpiderRunning';
    var isRunning = function() {
        return localStorage[IS_RUNNING_KEY] === 'true';
    };

    const IFRAME_CNT = 5;
    const END_URL = location.origin + '/end';

    var stopSpider = function () {
        localStorage[IS_RUNNING_KEY] = 'false';
    }
    
    var getIFrameUrlArr = function() {
        var result = [];
        for(var i = 0;i < IFRAME_CNT; ++i) {
            var id ='mh-iframe-' + i;
            var $iframe = $('#'+id);
            // https://stackoverflow.com/questions/938180/
            result.push($iframe[0].contentWindow.location.href);
        }
        return result;
    };

    return {
        start(initialEnqueueArr) {
            // set flag
            localStorage[IS_RUNNING_KEY] = 'true';

            // add data
            WaitList.clear();
            WaitList.enqueueArr(initialEnqueueArr);

            // add iframes
            for(var i = 0;i < IFRAME_CNT; ++i) {
                var id ='mh-iframe-' + i;
                var $iframe = $('#'+id);
                if($iframe.length == 0) {
                    $iframe = $('<iframe>', {
                        id:  id,
                    });
                    $iframe.appendTo('#mh-iframe-wrapper');
                }
                $iframe.attr('src', WaitList.dequeue());
            }

            // render ui
            showGrp('spider');
            var intervalId = undefined;
            var renderSpiderProgress = () => {
                var waitListObj = WaitList.getObj();
                $("#mh-spider-wait-list-len").text(waitListObj.curIdx + '/' + waitListObj.data.length);
                var isAllFrameEnd = () => (!getIFrameUrlArr().some(url => url != END_URL));
                if((waitListObj.data.length <= waitListObj.curIdx) && isAllFrameEnd()) {
                    clearInterval(intervalId);
                    stopSpider();
                    if(localStorage['inited'] !== 'true') {
                        markAllAsRead();
                    }
                    localStorage['inited'] = 'true';
                    renderDisplay(); // do this in main frame
                }
            }
            var intervalId = setInterval(renderSpiderProgress, 1000);
            renderSpiderProgress();
        },
        stop: stopSpider,
        autoNext() {
            if(!isRunning()) return;
            var url = WaitList.dequeue() || END_URL;
            log('AutoNext:', url, 'CurrentListLen:', WaitList.getObj().data.length);
            if(location.href != url) location.href = url;
        },
        autoEnqueueArr(arr) {
            if(!isRunning()) return;
            WaitList.enqueueArr(arr);
        },
        autoSave(type, id, data, prefix, doesForce) {
            if(isRunning() || doesForce) {
                StorageHelper.save(type, id, data, prefix);
            }
        },
        autoSleep(after) {
            if(isRunning()) {
                setTimeout(after, Math.random() * 1000);
            } else {
                after();
            }
        }
    }
})();

function atRootPage() {
    var courseArr = [];
    $(".coursebox .info .coursename a").each((idx, item) => {
        var $item = $(item);
        courseArr.push({
            id: $.endInt($item.attr('href')),
            href: $item.attr('href'),
            name: $item.text(),
        });
    });
    Spider.autoSave('root', undefined, courseArr, undefined, true);
}

function startSpider() {
    log("Start Spider");
    var courseArr = StorageHelper.get('root', undefined);
    Spider.start(courseArr.map(
        item => '/course/view.php?id=' + item.id
    ));
}

function stopSpider() {
    Spider.stop();
}

function atCourseRootPage() {
    var courseId = $_GET['id'];
    var $root = $("section#region-main");
    var dataArr = [];
    $root.find('.activity').each((idx, item) => {
        var $item = $(item);
        var id = $.endInt($item.attr('id'));
        var href = $item.find('a').attr('href');
        var type = $item[0].className
            .split(/\s+/)
            .filter(cls => cls != 'activity' && !cls.startsWith('modtype'))[0];
        var parentText = $item.parents('.content').find('h3.sectionname span').text();

        if($item.hasClass('folder')) {
            Spider.autoEnqueueArr(['/mod/folder/view.php?id=' + id]);
        }
        
        dataArr.push({
            id: id,
            href: href,
            name: parentText + '|' + $item.find(".instancename").pureText(),
            type: type,
        })
    });

    Spider.autoSave('course', courseId, dataArr);
    Spider.autoNext();
}

function atFolderPage(disableRetry) {

    if((!disableRetry) && $(".ygtvitem").length == 0) {
        log("FolderPage: not loaded and wait");
        setTimeout(atFolderPage, 300);
        return;
    }

    var folderId = $_GET['id'];
    var fileInfoArr = [];
    $(".ygtvcontent a").each((idx, item) => {
        var $item = $(item);
        fileInfoArr.push({
            href: $item.attr('href'),
            name: $item.find('.fp-filename').text(),
        });
    });

    if((!disableRetry) && fileInfoArr.length == 0) {
        log("FolderPage: empty result and retry");
        setTimeout(() => {
            atFolderPage(true);
        }, 500);
    } else {
        Spider.autoSave('folder', folderId, fileInfoArr);
        Spider.autoNext();
    }
}

function atOtherPage() {
    Spider.autoNext();
}

function bootSpider() {
    var path = location.pathname;
    if(isAtRootPage()) {
        atRootPage();
    } else {
        if(!inIframe()) return;
        Spider.autoSleep(() => {
            if(path.startsWith('/course/view.php')) {
                atCourseRootPage();
            } else if(path.startsWith('/mod/folder/view.php')) {
                atFolderPage();
            } else {
                atOtherPage();
            } 
        });
    }
}

// Displayer

function traversalTree(callback) {
    var displayArr = [];
    var solve = function(type, chainArr, children) {
        var curData = children;
        var oldData = StorageHelper.get(type, (chainArr[chainArr.length-1]||{}).id, 'old');
        var primaryKey = (type=='folder' ? 'href' : 'id');
        for(var item of $.diffByKey(curData, oldData, primaryKey)) {
            displayArr.push({diffType: 'add', data: item, chainArr: chainArr});
        }
        for(var item of $.diffByKey(oldData, curData, primaryKey)) {
            displayArr.push({diffType: 'sub', data: item, chainArr: chainArr});
        }
    };

    var rootChildren = StorageHelper.get('root');
    solve('root', [], rootChildren);
    for(var course of rootChildren) {
        var courseChildren = StorageHelper.get('course', course.id);
        solve('course', [course], courseChildren);
        for(var courseChild of courseChildren) {
            if(courseChild.type == 'folder') {
                var folder = courseChild;
                var folderChildren = StorageHelper.get('folder', folder.id);
                solve('folder', [course, folder], folderChildren);
            }
        }
    }

    return displayArr;
}

function markAllAsRead() {
    for(var key in window.localStorage){
        if(key.startsWith('cur')){
            window.localStorage['old'+key.substr(3)] = window.localStorage[key];
        }
    }
    renderDisplay();
}

function onInjectedDOMReady() {
    initListener();
    renderDisplay();
}

function initListener() {
    stopSpider();
    $(".mh-start-spider").click(startSpider);
    $(".mh-stop-spider").click(stopSpider);
    $("#mh-mark-read").click(markAllAsRead);
}

function renderDisplay() {
    if(localStorage['inited'] !== 'true') {
        showGrp('init');
    } else {
        showGrp('display');
        var $diffInfoUl = $("#mh-diff-info");
        $diffInfoUl.empty();
        var displayArr = traversalTree();
        const DIFF_TYPE_TO_TEXT = {
            'add': '+',
            'sub': '-'
        }
        if(displayArr.length==0) {
            $diffInfoUl.append('<li>Nothing changed. You can click the *refresh* button below after a while to check what\'s new.</li>');
        } else {
            for(var item of displayArr) {
                var text = '<span class="grey-text">' + DIFF_TYPE_TO_TEXT[item.diffType] + '</span> ';
                if(item.diffType=='sub') text += '<del>';
                var fullChainArr = item.chainArr.concat(item.data);
                var isAssignment = false;
                var isQuiz = false;
                for(var i = 0;i<fullChainArr.length; ++i) {
                    var chainItem = fullChainArr[i];
                    var isFirst = i == 0;
                    var isLast = i == fullChainArr.length - 1;
                    var innerText = (isFirst)
                        ? chainItem.name.substr(0, 7)
                        : chainItem.name;
                    isAssignment = isAssignment 
                        | ((chainItem.href||'').indexOf('/assign/')!=-1)
                        | ((chainItem.name||'').toLowerCase().indexOf('assignment')!=-1);
                    isQuiz = isQuiz 
                        | ((chainItem.href||'')+(chainItem.name||'')).indexOf('quiz')!=-1;
                    if(isLast) {
                        var splitArr = innerText.split('|');
                        if(splitArr.length==2) {
                            innerText = splitArr[0] + ' - <b>' + splitArr[1] + '</b>';
                        } else {
                            innerText = '<b>' + innerText + '</b>';
                        }
                    }
                    text +=
                        '<a href="'+ chainItem.href + '">' + innerText + '</a>' + (isLast?'':' - ');
                }
                if(item.diffType=='sub') text += '</del>';
                var $ele = $('<li>' + text + '</li>');
                if(isAssignment || isQuiz) {
                    $ele.css('color', 'rgba(111,19,106,0.9)');
                    $ele.css('font-weight', 'bold');
                }
                $ele.appendTo($diffInfoUl);
            }
        }
    }
}

function bootDisplayer() {
    if(inIframe()) return;
    if(isAtRootPage()) {
        $.get(getURL('moodle/index.template.html'), function(data) {
            $(data).prependTo('#frontpage-course-list');
            onInjectedDOMReady();
        });
    }
}

// Others

function bootOthers() {
    if(
        (!inIframe()) &&
        $("#page-navbar nav ul li:last-child").text().indexOf("EBP") != -1 &&
        location.href.indexOf('/course/') != -1
    ) {
        $.get(getURL('moodle/ebp_hint.template.html'), function(data) {
            $(data).prependTo('.course-content .topics');
        });
    }
}

// Quiz

var bootQuiz = (function(){
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

        $.get(getURL('moodle/quiz.template.html'), function(data) {
            $(data).prependTo('#region-main div[role=main] form>div');
            onInjectedDOMReady();
        });
    }

    return bootQuiz;
})();

bootByUrl('elearning.cuhk.edu.cn', () => {
    bootSpider();
    bootDisplayer();
    bootOthers();
    bootQuiz();
});
