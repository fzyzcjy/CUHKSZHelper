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

    const IFRAME_CNT = 3;

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
            $("<div>", {id: "mh-iframe-wrapper"}).appendTo("body");
            for(var i = 0;i < IFRAME_CNT; ++i) {
                $('<iframe>', {
                    id:  'mh-iframe-' + i,
                    src: WaitList.dequeue(), // initial src
                }).appendTo('#mh-iframe-wrapper');
            }
        },
        stop: stopSpider,
        autoNext() {
            if(!isRunning()) return;
            var url = WaitList.dequeue();
            console.log("AutoNext", url, 'CurrentList', WaitList.all(), WaitList.all().length);
            if(url) {
                setTimeout(() => {
                    location.href = url;
                }, Math.random() * 2000 + 300 );
            } else {
                stopSpider();
            }
        },
        autoEnqueueArr(arr) {
            if(!isRunning()) return;
            WaitList.enqueueArr(arr);
        },
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
    StorageHelper.save('root', undefined, courseArr);
}

function startSpider() {
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
        var type = $item[0].className
            .split(/\s+/)
            .filter(cls => cls != 'activity' && !cls.startsWith('modtype'))[0];

        if($item.hasClass('folder')) {
            Spider.autoEnqueueArr(['/mod/folder/view.php?id=' + id]);
        }
        
        dataArr.push({
            id: id,
            href: '/mod/resource/view.php?id=' + id,
            name: $item.find(".instancename").pureText(),
            type: type,
        })
    });

    StorageHelper.save('course', courseId, dataArr);
}

function atFolderPage() {
    var folderId = $_GET['id'];
    var fileInfoArr = [];
    $(".ygtvcontent a").each((idx, item) => {
        var $item = $(item);
        fileInfoArr.push({
            href: $item.attr('href'),
            name: $item.find('.fp-filename').text(),
        });
    });

    StorageHelper.save('folder', folderId, fileInfoArr);
}

function atOtherPage() {
    //
}

function boot() {
    var path = location.pathname;
    if(isAtRootPage()) {
        atRootPage();
    } else {
        if(path.startsWith('/course/view.php')) {
            atCourseRootPage();
        } else if(path.startsWith('/mod/folder/view.php')) {
            atFolderPage();
        } else {
            atOtherPage();
        } 
        Spider.autoNext();
    }
}

$(boot);