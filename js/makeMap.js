ymaps.ready(init);

function init(){

    // Создание карты
    var myMap = new ymaps.Map("map", {
        center: [55.76, 37.64],
        zoom: 17
    });
    
    // получение координат из адреса
    async function addressToCoords(address) {
        return ymaps.geocode(address).then(function(response) {
            let coords = response.geoObjects.get(0)
                .geometry.getCoordinates();
            
            return coords;
        }, function(reject) {
            console.log('error geocode', reject);
        });
    }
    
    // получение адреса из координат
    async function coordsToAddress(coords) {
        return ymaps.geocode(coords).then(function(response) {
            let address = response.geoObjects.get(0)
                .properties.get('metaDataProperty')
                .GeocoderMetaData.text;
            
            return address;
        }, function(reject) {
            console.log('error geocode', reject);
        });
    } 

    // клик по карте
    myMap.events.add('click', function (e) {
        let coords = e.get('coords');
        console.log(e); // !!! координаты x y брать тут

        coordsToAddress(coords).then(function(address) {
            createReview(address, coords);
        });
    });

    // закрытие отзыва
    function clearReview() {
        for (let child of document.querySelector('#map').children) {
            if(child.classList[0] == 'review') {
                child.remove();
            }
        }
    };

    // создание отзыва
    function createReview(address, coords) {
        clearReview();

        const newReview = document.createElement('div');

        newReview.classList = 'review';       
        newReview.style.position = 'fixed';
        newReview.style.top = clickY;
        newReview.style.left = clickX;
        newReview.insertAdjacentHTML('afterbegin', fillReview(address));
        document.querySelector('#map').appendChild(newReview);

        const form = newReview.querySelector('#form');

        form.addEventListener('click', function(e) {
            console.log(e.target.name);
        })

        newReview.querySelector('#send').addEventListener('click', function(e) {
            e.preventDefault();
            
            let message = {
                coords: coords,
                address: address,
                name: form.elements.name.value,
                place: form.elements.place.value,
                text: form.elements.text.value,
                date: date()
            }

            writeStore(message);
            createPlacemark(message);
            createReview(address, coords);
        });
        newReview.querySelector('#close').addEventListener('click', function() {
            clearReview();
        });
    }

    // заполение отзыва
    function fillReview(address) {
        let chat = [];

        for (let message of store) {
            if (message.address == address) {
                chat.push(message);
            }
        }
        if (chat.length == 0) {
            chat = [{text: 'no one message'}]
        }

        let reviewData = { 
            address: address,
            formName: 'name',
            formPlace: 'place',
            formText: 'text',
            chat: chat
        };
        const review = document.querySelector('#review').textContent;
        const template = Handlebars.compile(review);

        return template(reviewData);
    }

    // создание метки
    function createPlacemark(message) {
        let placemark = new ymaps.Placemark(message.coords, {
            balloonContent: fillBalloon(message)
        });
        
        placemark.events.add('click', function(e) {
            e.preventDefault();
            // Открыть свой попапп
            createReview(message.address, message.coords);
        });
        myClusterer.add(placemark);
    }

    // заполнение метки
    function fillBalloon(message) {
        let balloonData = {
            place: message.place,
            address: message.address,
            text: message.text,
            date: message.date
        }
        const balloon = document.querySelector('#balloon').textContent;
        const template = Handlebars.compile(balloon);

        return template(balloonData);
    }

    // создание кластера
    // !!! закрытие кластера через методы
    var myClusterer = new ymaps.Clusterer({
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: true,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
        clusterBalloonPanelMaxMapArea: 0,
        clusterBalloonContentLayoutWidth: 200,
        clusterBalloonContentLayoutHeight: 130,
        clusterBalloonPagerSize: 5
    });

    // добавление кластера на карту
    myMap.geoObjects.add(myClusterer);

    // заполнение метками из памяти при старте
    startCreatePlacemarks();

    function startCreatePlacemarks() {
        for (let message of store) {
            createPlacemark(message);
        }
    }

    let clickX = '100px';
    let clickY = '100px';
    
    document.addEventListener('click', function(e) {
        // определение места клика для окна отзыва
        // проверить ...
        if (e.target.tagName == 'YMAPS') {
            clickY = e.y;
            clickX = e.x;

            if (clickY > document.body.clientHeight - 530) {
                clickY = document.body.clientHeight - 530;
                if (clickY < 0) {
                    clickY = 0;
                }
            }
            if (clickX > document.body.clientWidth - 380) {
                clickX = document.body.clientWidth - 380;
                if (clickX < 0) {
                    clickX = 0;
                }
            }
            clickY = clickY + 'px';
            clickX = clickX + 'px';
        }
        // клик по ссылке
        if (e.target.tagName == "A") {
            let address = e.target.textContent;
            
            addressToCoords(address).then(function(coords) {
                createReview(address, coords);
            });
        }
    });
}

// работа с памятью
var store = JSON.parse(localStorage.getItem('marks')) || [];

function writeStore(message) {    
    store.push(message);
    localStorage.setItem('marks', JSON.stringify(store));
}

// дата
function date() {
    let date = new Date();
    let myDate = `${date.getFullYear()}.${date.getMonth()}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

    return myDate;
}