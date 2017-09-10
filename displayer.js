
function traversalTree(callback) {
    var rootData = StorageHelper.get('root');
    callback('root', undefined, rootData);
    for(var rootItem of rootData) {
        var courseData = StorageHelper.get('course', rootItem.id);
        callback('course', rootItem.id, courseData);
        for(var courseItem of courseData) {
            if(courseItem.type == 'folder') {
                var folderData = StorageHelper.get('folder', courseItem.id);
                callback('folder', courseItem.id, folderData);
            }
        }
    }
}

function display() {
    console.log("---Display Differences---");
    traversalTree(function(type, id, curData) {
        var oldData = StorageHelper.get(type, id, 'old');
        // console.log(type, id, 'cur', curData, 'old', oldData);
        var primaryKey = (type=='folder' ? 'href' : 'id');
        var additionData = $.diffByKey(curData, oldData, primaryKey);
        var subtractionData = $.diffByKey(oldData, curData, primaryKey);
        if(additionData.length > 0 || subtractionData.length > 0) {
            console.log(type, id, additionData, subtractionData);
        }
    });
}