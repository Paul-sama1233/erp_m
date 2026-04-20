from decimal import Decimal

from django.http import HttpResponse
from weasyprint import HTML
from django.template.loader import render_to_string
from datetime import datetime
from contracts.models import Contract



def generate_contract_pdf(request, contract_id):
    try:
        contract = Contract.objects.prefetch_related('items__product').get(id=contract_id)
    except Contract.DoesNotExist:
        return HttpResponse("Договор не найден", status=404)

    total_price = sum(item.quantity * item.price for item in contract.items.all())

    items_list = ", ".join([
        f"{item.product.name} ({item.quantity} шт.)" for item in contract.items.all()
    ]) if contract.items.exists() else "—"

    today = datetime.now().strftime("%d.%m.%Y")

    context = {
        'contract_id': contract.id,
        'today': today,
        'client_name': contract.client_name,
        'address': contract.address or "—",
        'items_list': items_list,
        'total_price': f"{total_price:,.0f}",
        'prepayment': f"{total_price * Decimal('0.8'):,.0f}",
        'final_payment': f"{total_price * Decimal('0.2'):,.0f}",
        'company_phone1': '+99897 402 55 48',
        'company_phone2': '+99897 402 55 49',
        'company_email': 'info@wallmann.uz',
        'company_website': 'wallmann.uz',
        'company_address': 'г. Ташкент, Яшнабадский район, ул. 1-я Мавлона Риёзий, д. 31.',
    }

    html_string = render_to_string('contracts/contract_pdf_template.html', context)

    pdf_file = HTML(string=html_string, base_url=request.build_absolute_uri('/')).write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Договор_{contract.id}.pdf"'
    return response

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ValidateAddressLocationIQView(APIView):
    """
    Проверка адреса через LocationIQ (бесплатный геокодер)
    Пример: GET /api/contracts/validate-address/?q=Ташкент, ул. Навои, 1
    """
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({"error": "Параметр q (адрес) обязателен"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = settings.LOCATIONIQ_API_KEY
        if not api_key or api_key == 'pk.твой_ключ_сюда':
            return Response({"error": "LocationIQ API ключ не настроен"}, status=500)

        url = "https://us1.locationiq.com/v1/search.php"

        params = {
            'key': api_key,
            'q': query,
            'format': 'json',
            'limit': 5,
            'addressdetails': 1,
            'accept-language': 'ru'
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if not data or len(data) == 0:
                return Response({
                    "valid": False,
                    "message": "Адрес не найден"
                })

            # Берём лучший результат
            best = data[0]

            result = {
                "valid": True,
                "message": "Адрес успешно найден",
                "formatted_address": best.get('display_name'),
                "coordinates": {
                    "lat": best.get('lat'),
                    "lon": best.get('lon')
                },
                "address": {
                    "house_number": best.get('address', {}).get('house_number'),
                    "road": best.get('address', {}).get('road'),
                    "city": best.get('address', {}).get('city'),
                    "state": best.get('address', {}).get('state'),
                }
            }

            return Response(result)

        except requests.exceptions.RequestException:
            return Response({
                "valid": False,
                "message": "Ошибка соединения с LocationIQ"
            }, status=502)
        except Exception as e:
            return Response({
                "valid": False,
                "message": f"Неизвестная ошибка: {str(e)}"
            }, status=500)