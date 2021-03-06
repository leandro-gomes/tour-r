import * as Handlebars from 'handlebars';

/* Handlebars helper function */

Handlebars.registerHelper('times', function(n, block) {
  var accum = '';
  for (var i = 0; i < n; ++i) accum += block.fn(i);
  return accum;
});

class Tour {
  constructor(element) {
    this.element = document.getElementById(element);
    this.url = 'https://api.myjson.com/bins/6iv3y';
    this.template = document.getElementById('tour-template').innerHTML;
  }

  _formatDate(date) {
    var monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
  }

  _findClosestAvailability(arr) {
    /* Avoid showing dates with no seats available */
    var availableArr = [],
      i = 0;

    while (availableArr.length != 2 && i < arr.length) {
      if (arr[i].availability && arr[i].availability > 0) {
        availableArr.push(arr[i]);
      }
      i++;
    }

    for (var item of availableArr) {
      item.start = this._formatDate(new Date(item.start));
    }

    return availableArr;
  }

  _findMaxDiscount(arr) {
    let max = arr[0].discount
      ? parseInt(arr[0].discount.substring(0, arr[0].discount.length - 1))
      : 0;

    for (let i = 1, len = arr.length; i < len; i++) {
      let v = arr[i].discount
        ? parseInt(arr[i].discount.substring(0, arr[i].discount.length - 1))
        : 0;
      max = v > max ? v : max;
    }

    if (max == 0) return null;
    return '-' + max + '%';
  }

  _findMinMaxPrice(arr) {
    let min = arr[0].eur,
      max = arr[0].eur;

    for (let i = 1, len = arr.length; i < len; i++) {
      let v = arr[i].eur;
      min = v < min ? v : min;
      max = v > max ? v : max;
    }

    return { min: min, max: max };
  }

  _findPrimaryImage(item) {
    const image = item.images.filter(img => img.is_primary);

    /* Sometimes "is_primary" is set to true but there is no url so first image available is chosen instead */

    return image.length > 0 && image[0].url && image[0].url != ''
      ? image[0].url
      : item.images[0]
      ? item.images[0].url
      : '';
  }

  _ratingStarsHelper(rating) {
    var obj = { full: 0, half: 0, empty: 5 };

    if (rating) {
      let fullStarsNumber = Math.floor(rating),
        halfStarsNumber = Number.isInteger(rating) ? 0 : 1;
      obj = {
        full: fullStarsNumber,
        half: halfStarsNumber,
        empty: 5 - (fullStarsNumber + halfStarsNumber),
      };
    }

    return obj;
  }

  handleResponse(response) {
    this.items = response;

    /* Data massage */
    for (var item of this.items) {
      item.image_primary = this._findPrimaryImage(item);
      item.priceRange = { min: 9999, max: 0 };
      if (item.dates.length > 0) {
        item.priceRange = this._findMinMaxPrice(item.dates);
        item.discount = this._findMaxDiscount(item.dates);
        item.spaces = this._findClosestAvailability(item.dates);
      }
      item.rating_helper = this._ratingStarsHelper(item.rating);
      item.visible = true;
    }

    /* Inital sorting */
    this.sortBy('cheap');
  }

  getTours() {
    fetch(this.url)
      .then(res => res.json())
      .then(response => this.handleResponse(response))
      .catch(error => console.error('Error:', error));
  }

  render() {
    var source = this.template;
    var template = Handlebars.compile(source);
    var html = template(this.items);
    this.element.innerHTML = html;
  }

  filterBy(date) {
    if (date) {
      for (var item of this.items) {
        item.visible = false;
        if (item.dates.length > 0) {
          if (item.dates.filter(d => d.start.startsWith(date)).length > 0) {
            item.visible = true;
          }
        }
      }
    } else {
      for (var item of this.items) {
        item.visible = true;
      }
    }
    this.render();
  }

  sortBy(criteria) {
    switch (criteria) {
      case 'cheap':
        this.items.sort((a, b) => a.priceRange.min - b.priceRange.min);
        break;
      case 'expensive':
        this.items.sort((a, b) => b.priceRange.max - a.priceRange.max);
        break;
      case 'long':
        this.items.sort((a, b) => b.length - a.length);
        break;
      case 'short':
        this.items.sort((a, b) => a.length - b.length);
        break;
    }
    this.render();
  }
}

export default Tour;
