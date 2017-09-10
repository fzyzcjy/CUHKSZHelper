
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
    traversalTree(console.log);
}