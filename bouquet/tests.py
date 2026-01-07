from django.test import TestCase, Client
from django.urls import reverse

class BouquetViewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_index_capitalization_query_params(self):
        response = self.client.get(reverse('index'), {'name': 'lili', 'message': 'happy birthday'})
        self.assertContains(response, "I got you some flowers, Lili")
        self.assertContains(response, "Happy birthday, Arne")

    def test_index_capitalization_path_params(self):
        response = self.client.get(reverse('index_with_name_and_message', kwargs={'name': 'lili', 'message': 'happy birthday'}))
        self.assertContains(response, "I got you some flowers, Lili")
        self.assertContains(response, "Happy birthday, Arne")

    def test_index_no_params(self):
        response = self.client.get(reverse('index'))
        self.assertContains(response, "I got you some flowers,")
        self.assertNotContains(response, ", Arne")

    def test_message_already_signed(self):
        response = self.client.get(reverse('index'), {'message': 'Happy birthday, Arne'})
        self.assertContains(response, "Happy birthday, Arne")
        self.assertNotContains(response, ", Arne, Arne")
