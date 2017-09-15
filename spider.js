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
                if($('#'+id).length > 0) continue;
                $('<iframe>', {
                    id:  id,
                    src: WaitList.dequeue(), // initial src
                }).appendTo('#mh-iframe-wrapper');
            }

            // render ui
            showGrp('spider');
            var intervalId = undefined;
            var renderSpiderProgress = () => {
                var waitListLen = WaitList.all().length;
                $("#mh-spider-progress").text('Remaining: ' + waitListLen);
                if(waitListLen == 0) {
                    clearInterval(intervalId);
                    renderDisplay(); // do this in main frame
                }
            }
            var intervalId = setInterval(renderSpiderProgress, 1000);
            renderSpiderProgress();
        },
        stop: stopSpider,
        autoNext() {
            if(!isRunning()) return;
            var url = WaitList.dequeue();
            console.log('AutoNext:', url, 'CurrentListLen:', WaitList.all().length);
            if(url) {
                location.href = url;
            } else {
                stopSpider();
            }
        },
        autoEnqueueArr(arr) {
            if(!isRunning()) return;
            WaitList.enqueueArr(arr);
        },
        autoSave(type, id, data, prefix, doesForce) {
            // console.log(data);
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
    console.log("Start Spider");
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
            name: parentText + ' - ' + $item.find(".instancename").pureText(),
            type: type,
        })
    });

    Spider.autoSave('course', courseId, dataArr);
}

function atFolderPage() {
    if($(".ygtvitem").length == 0) {
        console.log("FolderPage: maybe not finish loading");
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

    Spider.autoSave('folder', folderId, fileInfoArr);
}

function atOtherPage() {
    //
}

function boot() {
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
            Spider.autoNext();
        });
    }
}

$(boot);