/**
 * TODO - make urlToVideoId handle different kinds of urls
 * and extract the video ids accordingly
 * for now we are relying on v=something&
 */
const urlToVideoId = (url) => {
  var regExp =
    /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  var match = url.match(regExp);

  return match && match[1].length == 11 ? match[1] : -1;
};

module.exports = { urlToVideoId };
