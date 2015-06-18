var app = angular.module('appRomaneio', []);

app.controller('ComprimentosController', function($scope) {
    $scope.itens = [
        {comprimento: '3', quantidade: 0, indice: 0},
        {comprimento: '3.5', quantidade: 0, indice: 1}
    ];

    var valores = [$scope.itens[0].quantidade, $scope.itens[1].quantidade];
    var contIndice = 2;

    $scope.adicionaComprimento = function () {
        $scope.itens.push({comprimento: $scope.item.comprimento,
            quantidade: $scope.item.quantidade,
            indice: contIndice
            });
        $scope.item.comprimento = $scope.item.quantidade = '';
        contIndice++;
    };


    $scope.total = 0;

    $scope.excluir = function(indiceExcluir){
        alert(indiceExcluir);
        valores.splice(indiceExcluir,1);
        $scope.itens.splice(indiceExcluir,1);
        somarTotal();
        contIndice--;
    }

    var somarTotal = function(){

        $scope.total = 0;
        angular.forEach(valores, function(value, key) {
            $scope.total += value;
        });

    };

    $scope.change = function(qt, indiceItem) {
        valores[indiceItem] = qt;
        somarTotal();
    };
});