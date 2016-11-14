angular.module('App')
    .directive('resultpopup', function(Api, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'directives/resultpopup.html',
            scope: {
                //snip:    "=snip",
                options: "=options",
                visible: "=visible",
                infos: "=infos"
            },
            controllerAs: 'ResultPopup',
            bindToController: true,
            controller: function($scope, $element, $rootScope) {
                var scope = this;

                scope.getURLGif = function() {
                    return './img/gif/' + scope.options.quizz.channel + '/' + (scope.infos.answer.is_correct ? 'correct' : 'wrong') + '/' + Math.floor(Math.random() * (scope.infos.answer.is_correct ? scope.options.quizz.gifs.correct : scope.options.quizz.gifs.wrong) + 1) + ".gif"
                }

                scope.initURLGif = function() {
                    scope.urlGIF = scope.getURLGif();
                }

                scope.nextClip = function() {
                    scope.initURLGif();
                    $rootScope.$emit('nextClip');
                }

                scope.show = function() {
                    scope.visible = true;
                }

                $rootScope.$on('nextClip', function(e) {
                    scope.visible = false;
                });

                $rootScope.$on('answerGiven', function(e, infos) {
                    scope.show();
                    scope.infos.answer = infos;
                    scope.initURLGif();

                })
            }
        };

    });