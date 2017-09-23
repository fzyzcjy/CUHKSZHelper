var Spider = (function(){

    var WaitList = (function(){
        const KEY = 'waitList';
        var get = function() {
            try {
                return JSON.parse(localStorage[KEY]);
            } catch(e) {
                return [];
            }
        }
        var set = function(data) {
            localStorage[KEY] = JSON.stringify(data);
        }
        return {
            enqueueArr(arr) {
                set(get().concat(arr));
            },
            dequeue() {
                var data = get();
                var result = data.shift();
                set(data);
                return result;
            },
            all() {
                return get();
            },
            clear() {
                set([]);
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
                var waitListLen = WaitList.all().length;
                $("#mh-spider-wait-list-len").text('' + waitListLen);
                var isAllFrameEnd = () => {
                    for(var i = 0;i < IFRAME_CNT; ++i) {
                        var id ='mh-iframe-' + i;
                        var $iframe = $('#'+id);
                        // https://stackoverflow.com/questions/938180/
                        if($iframe[0].contentWindow.location.href != END_URL) {
                            console.log("Not all frame end", $iframe);
                            return false;
                        }
                    }
                    return true;
                };
                if(waitListLen == 0 && isAllFrameEnd()) {
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
            log('AutoNext:', url, 'CurrentListLen:', WaitList.all().length);
            location.href = url;
        },
        autoEnqueueArr(arr) {
            if(!isRunning()) return;
            WaitList.enqueueArr(arr);
        },
        autoSave(type, id, data, prefix, doesForce) {
            // log(data);
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

function boot() {
    if(!inIframe()) return;
    var path = location.pathname;
    if(isAtRootPage()) {
        atRootPage();
    } else {
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

$(boot);