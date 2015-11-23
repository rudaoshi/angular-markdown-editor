/**
 * Created by Sun on 15/8/23.
 */



(function () {


var app = angular.module('test',
    [
        'angular-power-marker'

    ]);





    app.controller('TestCtrl', [
        '$scope',

        function ($scope) {

            $scope.value = "\
# Strapdown Test Page \n\
\n\
## Test Mathjax\n\
\n\
If you lend me 5\$, I will have 10\$ in my pocket. Do you know \n\
$\sqrt{3x-1}+(1+x)^2$ and $x_{1,2} = \frac{-b \pm \sqrt{b^2-4ac}}{2b}.$\n\
\n\
\n\
And what's this???\n\
\n\
$$ \frac{R_a T_{im}}{V_{im}} $$\n\
\n\
| Align Left    | Align Center  | Align Right |\n\
| ------------- |:-------------:| -----:|\n\
| test one      | dollar        | $1600 |\n\
| double dollar | also works |   \$\$12 |\n\
| zebra stripes | are neat      |    \$\$1 |\n\
\n\
Hey, let's do something fantastic.\n"
        }]);


}).call(this);