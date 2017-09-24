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

function boot() {
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

$(boot);