var app = angular.module('appRomaneio', []);

app.controller('ComprimentosController', function($scope) {
    $scope.itens = [
        {comprimento: '3', quantidade: 3},
        {comprimento: '3,5', quantidade: 2}
    ];

    $scope.adicionaComprimento = function () {
        $scope.itens.push({comprimento: $scope.item.comprimento,
            quantidade: $scope.item.quantidade});
        $scope.item.comprimento = $scope.item.quantidade = '';
    };


    $scope.$watchCollection('itens',function(newValue, oldValue) {
        // Função disparada sempre que o objeto $scope.items sofrer alterações
        $scope.total = 0;
        angular.forEach($scope.itens, function(value, key) {
            $scope.total += value.quantidade;
        })
    });

    $scope.change = function() {
        $scope.total;
    };
});