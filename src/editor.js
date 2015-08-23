/**
 * Created by Sun on 15/8/23.
 */



// directive
(function() { 'use strict';
  angular.module('angular-markdown-editor', [])
  .directive('markdown-view', ['$window', '$sce', function($window, $sce) {
    var converter = $window.Markdown.getSanitizingConverter();

    return {
      template: "<div ng-bind-html='sanitisedHtml' />",
      restrict: 'E',
      replace: true,
      scope: {
        markdown: '=bindFrom' ,
        class: '='
      },
      link: function(scope, element, attrs) {
        scope.$watch('markdown', function(value) {
          if (value != undefined && value != '') {
            scope.html = converter.makeHtml(value);
          	scope.sanitisedHtml = $sce.trustAsHtml(scope.html);
          }
        });
      }
    };
  }])

.directive('markdownedit', [ '$window',
        function($window) {
    return {
      restrict: 'A',
      replace: false,
      link: function(scope, element, attrs) {
        var hiddenButtons = attrs.markdownHiddenButtons ? attrs.markdownHiddenButtons.split(",") : new Array();
//        hiddenButtons.push('cmdPreview');

        var on_preview = function(obj)
        {
            var text = obj.$textarea.val();

          	return render( text, null, null, true);
        };
        element.markdown({hiddenButtons: hiddenButtons,
        onPreview: on_preview});
      },
    };
  }])
  ;

}).call(this);
